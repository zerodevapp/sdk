import { KernelV3AccountAbi, KernelV4AccountAbi } from "@zerodev/sdk"
import type { GetKernelVersion, Install } from "@zerodev/sdk/types"
import { satisfies } from "semver"
import {
    type Address,
    type Client,
    type Hex,
    concat,
    encodeAbiParameters,
    isAddressEqual,
    keccak256,
    slice,
    zeroAddress
} from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"
import { getChainId, readContract } from "viem/actions"
import { getAction, pad } from "viem/utils"
import { PolicyFlags } from "./constants.js"
import { toPolicyId } from "./policies/index.js"
import { toSignerId } from "./signers/index.js"
import type {
    PermissionData,
    PermissionPlugin,
    PermissionPluginParams
} from "./types.js"
import { permissionToIdentifier } from "./utils.js"

export async function toPermissionValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        signer,
        policies,
        entryPoint,
        kernelVersion,
        flag = PolicyFlags.FOR_ALL_VALIDATION,
        permissionId
    }: PermissionPluginParams<entryPointVersion>
): Promise<PermissionPlugin<GetKernelVersion<entryPointVersion>>> {
    const chainId = client.chain ? client.chain.id : await getChainId(client)

    if (entryPoint.version !== "0.7" && entryPoint.version !== "0.8") {
        throw new Error(
            `EntryPoint version ${entryPoint.version} is not supported`
        )
    }

    const getEnableData = async (
        _kernelAccountAddress?: Address
    ): Promise<Hex> => {
        const enableData = encodeAbiParameters(
            [{ name: "policyAndSignerData", type: "bytes[]" }],
            [
                [
                    ...policies.map((policy) =>
                        concat([
                            policy.getPolicyInfoInBytes(),
                            policy.getPolicyData()
                        ])
                    ),
                    concat([
                        flag,
                        signer.signerContractAddress,
                        signer.getSignerData()
                    ])
                ]
            ]
        )
        return enableData
    }

    // only used for kernel v4
    const getInstalls = async (_internalData?: Hex): Promise<Install[]> => {
        const permissionId = getPermissionId()
        const paddedPermissionId = pad(permissionId, { size: 32, dir: "right" })

        const internalData = concat([permissionId, _internalData ?? "0x"])
        const policiesInstalls = policies.map((policy) => {
            const policyAddress = policy.policyParams.policyAddress
            if (!policyAddress) {
                throw new Error("unknown policy address")
            }
            const moduleData = concat([
                paddedPermissionId,
                policy.getPolicyData()
            ])

            return {
                moduleType: 5n,
                module: policyAddress,
                moduleData: moduleData,
                internalData
            }
        })
        const signerData = concat([paddedPermissionId, signer.getSignerData()])
        const signerInstall = {
            moduleType: 6n,
            module: signer.signerContractAddress,
            moduleData: signerData,
            internalData
        }

        return [...policiesInstalls, signerInstall]
    }

    const getPermissionId = (): Hex => {
        if (permissionId) {
            return permissionId
        }
        const pIdData = encodeAbiParameters(
            [{ name: "policyAndSignerData", type: "bytes[]" }],
            [[toPolicyId(policies), flag, toSignerId(signer)]]
        )
        return slice(keccak256(pIdData), 0, 4)
    }

    return {
        ...signer.account,
        kernelVersion,
        supportedKernelVersions: ">=0.3.0",
        validatorType: "PERMISSION",
        address: zeroAddress,
        source: "PermissionValidator",
        getEnableData,
        getInstalls,
        getIdentifier: getPermissionId,
        signMessage: async ({ message }) => {
            return concat([
                "0xff",
                await signer.account.signMessage({ message })
            ])
        },
        signTypedData: async (typedData) => {
            return concat([
                "0xff",
                await signer.account.signTypedData(typedData)
            ])
        },

        signUserOperation: async (userOperation): Promise<Hex> => {
            const userOpHash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId
            })

            const signature = await signer.account.signMessage({
                message: { raw: userOpHash }
            })

            // kernel v4
            if (satisfies(kernelVersion, ">=0.4.0")) {
                return encodeAbiParameters(
                    [{ name: "policiySignatures", type: "bytes[]" }],
                    [
                        policies
                            .map((policy) =>
                                policy.getSignaturePolicyData(userOperation)
                            )
                            .concat([signature])
                    ]
                )
            }
            // kernel v3
            return concat(["0xff", signature])
        },

        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },

        async getStubSignature(_userOperation) {
            if (satisfies(kernelVersion, ">=0.4.0")) {
                return encodeAbiParameters(
                    [{ name: "policiySignatures", type: "bytes[]" }],
                    [
                        policies
                            .map((policy) =>
                                policy.getSignaturePolicyData(_userOperation)
                            )
                            .concat([signer.getDummySignature()])
                    ]
                )
            }
            return concat(["0xff", signer.getDummySignature()])
        },
        getPluginSerializationParams: (): PermissionData => {
            return {
                policies,
                permissionId: getPermissionId()
            }
        },
        isEnabled: async (
            kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> => {
            try {
                const permissionId = getPermissionId()
                if (satisfies(kernelVersion, ">=0.4.0")) {
                    const validationInfo = await getAction(
                        client,
                        readContract,
                        "readContract"
                    )({
                        abi: KernelV4AccountAbi,
                        address: kernelAccountAddress,
                        functionName: "validationInfo",
                        args: [permissionToIdentifier(permissionId)]
                    })
                    return isAddressEqual(
                        validationInfo.signer,
                        signer.signerContractAddress
                    )
                }

                /// v3 kernel
                const permissionConfig = await getAction(
                    client,
                    readContract,
                    "readContract"
                )({
                    abi: KernelV3AccountAbi,
                    address: kernelAccountAddress,
                    functionName: "permissionConfig",
                    args: [permissionId]
                })
                return isAddressEqual(
                    permissionConfig.signer,
                    signer.signerContractAddress
                )
            } catch (error) {
                return false
            }
        }
    }
}
