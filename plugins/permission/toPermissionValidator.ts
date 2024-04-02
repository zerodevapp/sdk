import { KernelV3AccountAbi } from "@zerodev/sdk"
import { getAction, getUserOperationHash } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concat,
    encodeAbiParameters,
    keccak256,
    pad,
    slice,
    zeroAddress
} from "viem"
import { getChainId, readContract } from "viem/actions"
import { PolicyFlags } from "./constants.js"
import { toPolicyId } from "./policies/index.js"
import { toSignerId } from "./signers/index.js"
import type {
    PermissionData,
    PermissionPlugin,
    PermissionPluginParams
} from "./types.js"

export async function toPermissionValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        policies,
        entryPoint: entryPointAddress,
        flag = PolicyFlags.FOR_ALL_VALIDATION
    }: PermissionPluginParams
): Promise<PermissionPlugin<entryPoint>> {
    const chainId = await getChainId(client)

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
                            policy.getPolicyData(getPermissionId())
                        ])
                    ),
                    concat([
                        flag,
                        signer.signerContractAddress,
                        signer.getSignerData(getPermissionId())
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
        return slice(keccak256(pIdData), 0, 2)
    }

    return {
        ...signer.account,
        address: zeroAddress,
        source: "PermissionValidator",
        isPermissionValidator: true,
        getEnableData,
        getPermissionId,

        signMessage: async ({ message }) => {
            return concat([
                getPermissionId(),
                await signer.account.signMessage({ message })
            ])
        },
        signTypedData: async (typedData) => {
            return concat([
                getPermissionId(),
                await signer.account.signTypedData(typedData)
            ])
        },

        signUserOperation: async (userOperation): Promise<Hex> => {
            const userOpHash = getUserOperationHash({
                userOperation: { ...userOperation, signature: "0x" },
                entryPoint: entryPointAddress,
                chainId: chainId
            })

            const signature = await signer.account.signMessage({
                message: { raw: userOpHash }
            })
            return concat(["0xff", signature])
        },

        getNonceKey: async () => {
            return 0n
        },

        async getDummySignature(_userOperation) {
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
                    readContract
                )({
                    abi: KernelV3AccountAbi,
                    address: kernelAccountAddress,
                    functionName: "permissionConfig",
                    args: [
                        concat([
                            "0x00",
                            pad(getPermissionId(), {
                                size: 20,
                                dir: "right"
                            })
                        ])
                    ]
                })
                return permissionConfig.signer === signer.signerContractAddress
            } catch (error) {
                return false
            }
        }
    }
}
