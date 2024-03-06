import { KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import { getAction, getUserOperationHash } from "permissionless"
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
    toHex
} from "viem"
import { getChainId, readContract } from "viem/actions"
import { ModularPermissionValidatorAbi } from "./abi/ModularPermissionValidatorAbi.js"
import { MAX_FLAG, MODULAR_PERMISSION_VALIDATOR_ADDRESS } from "./constants.js"
import type { Policy } from "./policies/types.js"
import { type ModularSigner } from "./signers/types.js"
import {
    type ModularPermissionData,
    type ModularPermissionPlugin,
    type Nonces
} from "./types.js"

export async function createPermissionValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        policies,
        validUntil,
        validAfter,
        validatorAddress = MODULAR_PERMISSION_VALIDATOR_ADDRESS
    }: {
        signer: ModularSigner
        validUntil?: number
        validAfter?: number
        policies: Policy[]
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<ModularPermissionPlugin> {
    const chainId = await getChainId(client)

    const getNonces = async (
        kernelAccountAddress: Address
    ): Promise<Nonces> => {
        const nonce = await getAction(
            client,
            readContract
        )({
            abi: ModularPermissionValidatorAbi,
            address: validatorAddress,
            functionName: "nonces",
            args: [kernelAccountAddress]
        })

        return { lastNonce: nonce[0], revoked: nonce[1] }
    }

    const getEnableData = async (
        kernelAccountAddress?: Address
    ): Promise<Hex> => {
        const nonce = kernelAccountAddress
            ? (await getNonces(kernelAccountAddress)).lastNonce + 1n
            : 0n
        const enableData = concat([
            pad(toHex(nonce), { size: 16 }),
            MAX_FLAG,
            pad(toHex(validAfter ?? 0), { size: 6 }),
            pad(toHex(validUntil ?? 0), { size: 6 }),
            signer.signerContractAddress,
            encodeAbiParameters(
                [
                    { name: "policies", type: "bytes32[]" },
                    { name: "signerData", type: "bytes" },
                    { name: "policyData", type: "bytes[]" }
                ],
                [
                    policies.map((policy) => policy.getPolicyInfoInBytes()),
                    signer.getSignerData(),
                    policies.map((policy) => policy.getPolicyData())
                ]
            )
        ])
        return enableData
    }

    const getPermissionId = () => {
        const pIdData = encodeAbiParameters(
            [
                { name: "flag", type: "bytes12" },
                { name: "signer", type: "address" },
                { name: "validAfter", type: "uint48" },
                { name: "validUntil", type: "uint48" },
                { name: "policies", type: "bytes32[]" },
                { name: "signerData", type: "bytes" },
                { name: "policyData", type: "bytes[]" }
            ],
            [
                MAX_FLAG,
                signer.signerContractAddress,
                validAfter ?? 0,
                validUntil ?? 0,
                policies.map((policy) => policy.getPolicyInfoInBytes()),
                signer.getSignerData(),
                policies.map((policy) => policy.getPolicyData())
            ]
        )
        return keccak256(pIdData)
    }

    return {
        ...signer.account,
        address: validatorAddress,
        source: "ModularPermissionValidator",
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
                entryPoint,
                chainId: chainId
            })

            const signature = await signer.account.signMessage({
                message: { raw: userOpHash }
            })
            return concat([
                getPermissionId(),
                ...policies.map((policy) =>
                    policy.getSignaturePolicyData(userOperation)
                ),
                signature
            ])
        },

        getNonceKey: async () => {
            return 0n
        },

        async getDummySignature(userOperation) {
            return concat([
                getPermissionId(),
                ...policies.map((policy) =>
                    policy.getSignaturePolicyData(userOperation)
                ),
                signer.getDummySignature()
            ])
        },
        getPluginSerializationParams: (): ModularPermissionData => {
            return {
                validAfter,
                validUntil,
                policies
            }
        },
        isEnabled: async (
            kernelAccountAddress: Address,
            selector: Hex
        ): Promise<boolean> => {
            try {
                const execDetail = await getAction(
                    client,
                    readContract
                )({
                    abi: KernelAccountAbi,
                    address: kernelAccountAddress,
                    functionName: "getExecution",
                    args: [selector]
                })
                const permission = await getAction(
                    client,
                    readContract
                )({
                    abi: ModularPermissionValidatorAbi,
                    address: validatorAddress,
                    functionName: "permissions",
                    args: [getPermissionId(), kernelAccountAddress]
                })
                return (
                    execDetail.validator.toLowerCase() ===
                        validatorAddress.toLowerCase() &&
                    permission[3] !==
                        "0x0000000000000000000000000000000000000000000000000000000000000000"
                )
            } catch (error) {
                return false
            }
        }
    }
}
