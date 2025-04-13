import { KernelV3AccountAbi } from "@zerodev/sdk"
import {
    type Address,
    type Client,
    type Hex,
    concat,
    encodeAbiParameters,
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
import { getAction } from "viem/utils"
import { PolicyFlags } from "./constants.js"
import { toPolicyId } from "./policies/index.js"
import { toSignerId } from "./signers/index.js"
import type {
    PermissionData,
    PermissionPlugin,
    PermissionPluginParams
} from "./types.js"

export async function toPermissionValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        signer,
        policies,
        entryPoint,
        kernelVersion: _,
        flag = PolicyFlags.FOR_ALL_VALIDATION
    }: PermissionPluginParams<entryPointVersion>
): Promise<PermissionPlugin> {
    const chainId = client.chain
        ? client.chain.id
        : await getChainId(client)

    if (entryPoint.version !== "0.7") {
        throw new Error("Only EntryPoint 0.7 is supported")
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

    const getPermissionId = (): Hex => {
        const pIdData = encodeAbiParameters(
            [{ name: "policyAndSignerData", type: "bytes[]" }],
            [[toPolicyId(policies), flag, toSignerId(signer)]]
        )
        return slice(keccak256(pIdData), 0, 4)
    }

    return {
        ...signer.account,
        supportedKernelVersions: ">=0.3.0",
        validatorType: "PERMISSION",
        address: zeroAddress,
        source: "PermissionValidator",
        getEnableData,
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
            return concat(["0xff", signature])
        },

        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },

        async getStubSignature(_userOperation) {
            return concat(["0xff", signer.getDummySignature()])
        },
        getPluginSerializationParams: (): PermissionData => {
            return {
                policies
            }
        },
        isEnabled: async (
            kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> => {
            try {
                const permissionConfig = await getAction(
                    client,
                    readContract,
                    "readContract"
                )({
                    abi: KernelV3AccountAbi,
                    address: kernelAccountAddress,
                    functionName: "permissionConfig",
                    args: [getPermissionId()]
                })
                return permissionConfig.signer === signer.signerContractAddress
            } catch (error) {
                return false
            }
        }
    }
}
