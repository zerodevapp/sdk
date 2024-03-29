import { KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import type { KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import {
    type UserOperation,
    getAction,
    getUserOperationHash
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    encodeFunctionData,
    keccak256,
    parseAbiParameters
} from "viem"
import { toAccount } from "viem/accounts"
import { getChainId, readContract } from "viem/actions"
import { WeightedValidatorAbi } from "./abi.js"
import { WEIGHTED_ECDSA_VALIDATOR_ADDRESS } from "./index.js"

export interface WeightedECDSAValidatorConfig {
    threshold: number
    signers: Array<{
        address: Address
        weight: number
    }>
    delay?: number // in seconds
}

// Sort addresses in descending order
const sortByAddress = (a: { address: Address }, b: { address: Address }) => {
    return a.address.toLowerCase() < b.address.toLowerCase() ? 1 : -1
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
        signers: _signers,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
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

    // sort signers by address in descending order
    const configSigners = config ? [...config.signers].sort(sortByAddress) : []

    // sort signers by address in descending order
    const signers = _signers.sort(sortByAddress)

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
                    configSigners.map((signer) => signer.address),
                    configSigners.map((signer) => signer.weight),
                    config.threshold,
                    config.delay || 0
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
            // n - 1 signers sign for callDataAndNonceHash
            for (let i = 0; i < signers.length - 1; i++) {
                const signer = signers[i]
                const signature = await signer.signTypedData({
                    domain: {
                        name: "WeightedECDSAValidator",
                        version: "0.0.3",
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

            // last signer signs for userOpHash
            const userOpHash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPoint,
                chainId: chainId
            })

            const lastSignature = await signers[signers.length - 1].signMessage(
                {
                    message: { raw: userOpHash }
                }
            )

            // Remove the '0x' prefix
            signatures += lastSignature.startsWith("0x")
                ? lastSignature.substring(2)
                : lastSignature

            return `0x${signatures}`
        },

        // Get simple dummy signature
        // Equivalent to signUserOperation for now
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
            // n - 1 signers sign for callDataAndNonceHash
            for (let i = 0; i < signers.length - 1; i++) {
                const signer = signers[i]
                const signature = await signer.signTypedData({
                    domain: {
                        name: "WeightedECDSAValidator",
                        version: "0.0.3",
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
            // last signer signs for userOpHash
            const signature =
                "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

            // Remove the '0x' prefix
            signatures += signature.startsWith("0x")
                ? signature.substring(2)
                : signature

            return `0x${signatures}`
        },

        async isEnabled(
            kernelAccountAddress: Address,
            selector: Hex
        ): Promise<boolean> {
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
                return (
                    execDetail.validator.toLowerCase() ===
                    validatorAddress.toLowerCase()
                )
            } catch (error) {
                return false
            }
        }
    }
}

export function getUpdateConfigCall(newConfig: WeightedECDSAValidatorConfig): {
    to: Address
    value: bigint
    data: Hex
} {
    const signers = [...newConfig.signers].sort(sortByAddress)

    return {
        to: WEIGHTED_ECDSA_VALIDATOR_ADDRESS,
        value: 0n,
        data: encodeFunctionData({
            abi: WeightedValidatorAbi,
            functionName: "renew",
            args: [
                signers.map((signer) => signer.address) ?? [],
                signers.map((signer) => signer.weight) ?? [],
                newConfig.threshold,
                newConfig.delay || 0
            ]
        })
    }
}

export async function getCurrentSigners<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        multiSigAccountAddress,
        validatorAddress = WEIGHTED_ECDSA_VALIDATOR_ADDRESS
    }: {
        multiSigAccountAddress: Address
        validatorAddress?: Address
    }
): Promise<Array<{ address: Address; weight: number }>> {
    const signers: Array<{ address: Address; weight: number }> = []
    let nextGuardian: Address

    // Fetch first guardian info from weightedStorage
    const weightedStorage = await getAction(
        client,
        readContract
    )({
        abi: WeightedValidatorAbi,
        address: validatorAddress,
        functionName: "weightedStorage",
        args: [multiSigAccountAddress]
    })

    nextGuardian = weightedStorage[3]

    // Loop until nextGuardian is the address(maxUint160) value
    while (nextGuardian !== "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF") {
        const guardianStorage = await getAction(
            client,
            readContract
        )({
            abi: WeightedValidatorAbi,
            address: validatorAddress,
            functionName: "guardian",
            args: [nextGuardian, multiSigAccountAddress]
        })

        const guardianWeight = guardianStorage[0]
        signers.push({ address: nextGuardian, weight: guardianWeight })

        nextGuardian = guardianStorage[1]
    }

    return signers
}
