import { constants, KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import { fixSignedData } from "@zerodev/sdk"
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
import {
    ECDSA_SIGNER_CONTRACT,
    MAX_FLAG,
    MODULAR_PERMISSION_VALIDATOR_ADDRESS
} from "./constants.js"
import { type ModularSigner } from "./signers/types.js"
import {
    type ModularPermissionData,
    type ModularPermissionPlugin,
    type Nonces
} from "./types.js"

export async function signerToModularPermissionValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        validatorData,
        validatorAddress = MODULAR_PERMISSION_VALIDATOR_ADDRESS
    }: {
        signer: ModularSigner
        validatorData: ModularPermissionData
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

        return { next: nonce[0], revoked: nonce[1] }
    }

    const getEnableData = async (
        kernelAccountAddress?: Address
    ): Promise<Hex> => {
        if (!kernelAccountAddress) {
            throw new Error("Kernel account address not provided")
        }
        const nonce = (await getNonces(kernelAccountAddress)).next
        const enableData = concat([
            pad(toHex(nonce), { size: 16 }),
            MAX_FLAG,
            pad(toHex(validatorData?.validAfter ?? 0), { size: 6 }),
            pad(toHex(validatorData?.validUntil ?? 0), { size: 6 }),
            ECDSA_SIGNER_CONTRACT,
            encodeAbiParameters(
                [
                    { name: "policies", type: "bytes32[]" },
                    { name: "signerData", type: "bytes" },
                    { name: "policyData", type: "bytes[]" }
                ],
                [
                    validatorData.policies.map((policy) =>
                        policy.getPolicyInfoInBytes()
                    ),
                    signer.account.address,
                    validatorData.policies.map((policy) =>
                        policy.getPolicyData()
                    )
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
                ECDSA_SIGNER_CONTRACT,
                validatorData?.validAfter ?? 0,
                validatorData?.validUntil ?? 0,
                validatorData.policies.map((policy) =>
                    policy.getPolicyInfoInBytes()
                ),
                signer.account.address,
                validatorData.policies.map((policy) => policy.getPolicyData())
            ]
        )
        return keccak256(pIdData)
    }

    return {
        ...signer.account,
        address: validatorAddress,
        source: "ModularPermissionValidator",
        getEnableData,

        signUserOperation: async (userOperation): Promise<Hex> => {
            const userOpHash = getUserOperationHash({
                userOperation: { ...userOperation, signature: "0x" },
                entryPoint,
                chainId: chainId
            })

            const signature = await signer.account.signMessage({
                message: { raw: userOpHash }
            })
            const fixedSignature = fixSignedData(signature)
            return concat([
                getPermissionId(),
                ...validatorData.policies.map((policy) =>
                    policy.getSignaturePolicyData(userOperation)
                ),
                fixedSignature
            ])
        },

        getNonceKey: async () => {
            return BigInt(signer.account.address)
        },

        async getDummySignature(userOperation) {
            return concat([
                getPermissionId(),
                ...validatorData.policies.map((policy) =>
                    policy.getSignaturePolicyData(userOperation)
                ),
                constants.DUMMY_ECDSA_SIG
            ])
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
