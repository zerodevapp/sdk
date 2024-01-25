import { KERNEL_ADDRESSES } from "@zerodev/sdk"
import type { KernelValidator } from "@zerodev/sdk/types"
import { ValidatorMode } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import { type SmartAccountClient, type UserOperation } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    encodeFunctionData,
    keccak256,
    parseAbiParameters
} from "viem"
import { toAccount } from "viem/accounts"
import { getChainId } from "viem/actions"
import { WeightedValidatorAbi } from "./abi.js"
import { WEIGHTED_ECDSA_VALIDATOR_ADDRESS } from "./index.js"

export interface WeightedECDSAValidatorConfig {
    threshold: number
    delay: number // in seconds
    signers: Array<{
        address: Address
        weight: number
    }>
}

export async function createWeightedECDSAValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        config,
        signers,
        validatorAddress = WEIGHTED_ECDSA_VALIDATOR_ADDRESS
    }: {
        config?: WeightedECDSAValidatorConfig
        signers: Array<SmartAccountSigner<TSource, TAddress>>
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<KernelValidator<"WeightedECDSAValidator">> {
    // Check if sum of weights is equal or greater than threshold
    if (config) {
        let sum = 0
        for (const signer of config.signers) {
            sum += signer.weight
        }
        if (sum < config.threshold) {
            throw new Error(
                `Sum of weights (${sum}) is less than threshold (${config.threshold})`
            )
        }
    }

    // Fetch chain id
    const chainId = await getChainId(client)

    const account = toAccount({
        address: signers[0].address, // note that this address is not used
        async signMessage({ message }) {
            // Sign the hash with all signers and pack the signatures
            let signatures = ""

            for (const signer of signers) {
                const signature = await signer.signMessage({
                    message
                })
                // Remove the '0x' prefix
                signatures += signature.startsWith("0x")
                    ? signature.substring(2)
                    : signature
            }

            return `0x${signatures}`
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            let signatures = ""
            for (const signer of signers) {
                const signature = await signer.signTypedData(typedData)
                // Remove the '0x' prefix from subsequent signatures
                signatures += signature.startsWith("0x")
                    ? signature.substring(2)
                    : signature
            }

            // Prepend '0x' to the packed signatures
            return `0x${signatures}`
        }
    })

    return {
        ...account,
        address: validatorAddress,
        source: "WeightedECDSAValidator",

        async getEnableData() {
            if (!config) return "0x" // TODO: check if this is correct
            return encodeAbiParameters(
                [
                    { name: "_guardians", type: "address[]" },
                    { name: "_weights", type: "uint24[]" },
                    { name: "_threshold", type: "uint24" },
                    { name: "_delay", type: "uint48" }
                ],
                [
                    config.signers.map((signer) => signer.address),
                    config.signers.map((signer) => signer.weight),
                    config.threshold,
                    config.delay
                ]
            )
        },
        async getNonceKey() {
            return 0n
        },
        // Sign a user operation
        async signUserOperation(userOperation: UserOperation) {
            const callDataAndNonceHash = keccak256(
                encodeAbiParameters(
                    parseAbiParameters("address, bytes, uint256"),
                    [
                        userOperation.sender,
                        userOperation.callData,
                        userOperation.nonce
                    ]
                )
            )

            let signatures = ""
            for (const signer of signers) {
                const signature = await signer.signTypedData({
                    domain: {
                        name: "WeightedECDSAValidator",
                        version: "0.0.1",
                        chainId,
                        verifyingContract: validatorAddress
                    },
                    types: {
                        Approve: [
                            { name: "callDataAndNonceHash", type: "bytes32" }
                        ]
                    },
                    primaryType: "Approve",
                    message: {
                        callDataAndNonceHash
                    }
                })
                // Remove the '0x' prefix
                signatures += signature.startsWith("0x")
                    ? signature.substring(2)
                    : signature
            }

            return signatures as `0x${string}`
        },

        // Get simple dummy signature
        async getDummySignature(userOperation: UserOperation) {
            const callDataAndNonceHash = keccak256(
                encodeAbiParameters(
                    parseAbiParameters("address, bytes, uint256"),
                    [
                        userOperation.sender,
                        userOperation.callData,
                        userOperation.nonce
                    ]
                )
            )

            let signatures = ""
            for (const signer of signers) {
                const signature = await signer.signTypedData({
                    domain: {
                        name: "WeightedECDSAValidator",
                        version: "0.0.1",
                        chainId,
                        verifyingContract: validatorAddress
                    },
                    types: {
                        Approve: [
                            { name: "callDataAndNonceHash", type: "bytes32" }
                        ]
                    },
                    primaryType: "Approve",
                    message: {
                        callDataAndNonceHash
                    }
                })
                // Remove the '0x' prefix
                signatures += signature.startsWith("0x")
                    ? signature.substring(2)
                    : signature
            }

            return signatures as `0x${string}`
        },

        async getValidatorMode() {
            return ValidatorMode.sudo
        }
    }
}

export async function updateConfig(
    kernelClient: SmartAccountClient,
    newConfig: WeightedECDSAValidatorConfig
) {
    if (!kernelClient.account) {
        throw new Error("Kernel account is not initialized")
    }

    await kernelClient.sendUserOperation({
        account: kernelClient.account,
        userOperation: {
            callData: await kernelClient.account.encodeCallData({
                to: WEIGHTED_ECDSA_VALIDATOR_ADDRESS,
                value: 0n,
                data: encodeFunctionData({
                    abi: WeightedValidatorAbi,
                    functionName: "renew",
                    args: [
                        newConfig.signers.map((signer) => signer.address) ?? [],
                        newConfig.signers.map((signer) => signer.weight) ?? [],
                        newConfig.threshold,
                        newConfig.delay
                    ]
                })
            })
        }
    })
}
