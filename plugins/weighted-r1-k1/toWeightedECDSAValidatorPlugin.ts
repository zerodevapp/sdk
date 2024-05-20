import { KernelAccountAbi } from "@zerodev/sdk"
import type { KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import {
    type UserOperation,
    getEntryPointVersion,
    getUserOperationHash
} from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    keccak256,
    parseAbiParameters,
    type LocalAccount,
    zeroAddress
} from "viem"
import { toAccount } from "viem/accounts"
import { getChainId, readContract } from "viem/actions"
import { concatHex, getAction, toHex } from "viem/utils"
import { type SIGNER_TYPE, WEIGHTED_VALIDATOR_ADDRESS_V07 } from "./index.js"
import type { WebAuthnKey } from "./signers/toWebAuthnSigner.js"
import { encodeWebAuthnPubKey } from "./signers/webAuthnUtils.js"

export type WeightedSigner = {
    account: LocalAccount
    getDummySignature: () => Hex
    getPublicKey: () => Hex
    type: SIGNER_TYPE
}

export interface WeightedECDSAValidatorConfig {
    threshold: number
    signers: Array<{
        type: SIGNER_TYPE
        publicKey: WebAuthnKey | Address
        weight: number
    }>
    delay?: number // in seconds
}

// Sort addresses in descending order
const sortByPublicKey = (
    a: { publicKey: Hex } | { getPublicKey: () => Hex },
    b: { publicKey: Hex } | { getPublicKey: () => Hex }
) => {
    if ("publicKey" in a && "publicKey" in b)
        return a.publicKey.toLowerCase() < b.publicKey.toLowerCase() ? 1 : -1
    else if ("getPublicKey" in a && "getPublicKey" in b)
        return a.getPublicKey().toLowerCase() < b.getPublicKey().toLowerCase()
            ? 1
            : -1
    else return 0
}

export const getValidatorAddress = (entryPointAddress: EntryPoint): Address => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    if (entryPointVersion === "v0.6")
        throw new Error("EntryPoint v0.6 not supported")
    return WEIGHTED_VALIDATOR_ADDRESS_V07
}

export async function createWeightedValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        config,
        entryPoint: entryPointAddress,
        signers: _signers,
        validatorAddress
    }: {
        config?: WeightedECDSAValidatorConfig
        signers: WeightedSigner[]
        entryPoint: entryPoint
        validatorAddress?: Address
    }
): Promise<KernelValidator<entryPoint, "WeightedValidator">> {
    validatorAddress =
        validatorAddress ?? getValidatorAddress(entryPointAddress)
    if (!validatorAddress) {
        throw new Error("Validator address not provided")
    }
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
    const configSigners = config
        ? [...config.signers]
              .map((signer) =>
                  typeof signer.publicKey === "object"
                      ? {
                            ...signer,
                            publicKey: encodeWebAuthnPubKey(
                                signer.publicKey
                            ) as Hex
                        }
                      : { ...signer, publicKey: signer.publicKey as Hex }
              )
              .sort(sortByPublicKey)
        : []

    // sort signers by address in descending order
    const signers = _signers.sort(sortByPublicKey)

    // Fetch chain id
    const chainId = await getChainId(client)

    const account = toAccount({
        address: zeroAddress, // note that this address is not used
        async signMessage({ message }) {
            // Sign the hash with all signers and pack the signatures
            let signatures = ""

            for (const signer of signers) {
                const signature = await signer.account.signMessage({
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
                const signature = await signer.account.signTypedData(typedData)
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
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WeightedValidator",
        getIdentifier: () =>
            validatorAddress ?? getValidatorAddress(entryPointAddress),

        async getEnableData() {
            if (!config) return "0x"
            console.log(
                configSigners.map((cfg) =>
                    concatHex([
                        cfg.type,
                        toHex(cfg.weight, { size: 3 }),
                        cfg.publicKey
                    ])
                )
            )
            return concatHex([
                toHex(config.threshold, { size: 3 }),
                toHex(config.delay || 0, { size: 6 }),
                encodeAbiParameters(
                    [{ name: "guardiansData", type: "bytes[]" }],
                    [
                        configSigners.map((cfg) =>
                            concatHex([
                                cfg.type,
                                toHex(cfg.weight, { size: 3 }),
                                cfg.publicKey
                            ])
                        )
                    ]
                )
            ])
        },
        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },
        // Sign a user operation
        async signUserOperation(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
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

            const signatures: Hex[] = []
            // n - 1 signers sign for callDataAndNonceHash
            for (let i = 0; i < signers.length - 1; i++) {
                const signer = signers[i]
                const signature = await signer.account.signTypedData({
                    domain: {
                        name: "WeightedValidator",
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
                console.log(`Sig[${i}]: `, signature)
                signatures[i] = signature
            }

            // last signer signs for userOpHash
            const userOpHash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPointAddress,
                chainId: chainId
            })

            const lastSignature = await signers[
                signers.length - 1
            ].account.signMessage({
                message: { raw: userOpHash }
            })
            console.log("LastSig: ", lastSignature)

            signatures.push(lastSignature)

            return encodeAbiParameters(
                [{ name: "signatures", type: "bytes[]" }],
                [
                    signatures.map((sig, idx) =>
                        concatHex([toHex(idx, { size: 1 }), sig])
                    )
                ]
            )
        },

        // Get simple dummy signature
        // Equivalent to signUserOperation for now
        async getDummySignature(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
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

            const signatures: Hex[] = []
            // n - 1 signers sign for callDataAndNonceHash
            for (let i = 0; i < signers.length - 1; i++) {
                const signer = signers[i]
                const signature = await signer.account.signTypedData({
                    domain: {
                        name: "WeightedValidator",
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
                console.log(`Sig[${i}]: `, signature)
                signatures[i] = signature
            }

            signatures.push(signers[signers.length - 1].getDummySignature())
            console.log(
                "LastSig: ",
                signers[signers.length - 1].getDummySignature()
            )

            return encodeAbiParameters(
                [{ name: "signatures", type: "bytes[]" }],
                [
                    signatures.map((sig, idx) =>
                        concatHex([toHex(idx, { size: 1 }), sig])
                    )
                ]
            )
        },

        async isEnabled(
            kernelAccountAddress: Address,
            selector: Hex
        ): Promise<boolean> {
            try {
                const execDetail = await getAction(
                    client,
                    readContract,
                    "readContract"
                )({
                    abi: KernelAccountAbi,
                    address: kernelAccountAddress,
                    functionName: "getExecution",
                    args: [selector]
                })
                return (
                    execDetail.validator.toLowerCase() ===
                    validatorAddress?.toLowerCase()
                )
            } catch (error) {
                return false
            }
        }
    }
}

// [TODO]
// export function getUpdateConfigCall<entryPoint extends EntryPoint>(
//     entryPointAddress: entryPoint,
//     newConfig: WeightedECDSAValidatorConfig
// ): {
//     to: Address
//     value: bigint
//     data: Hex
// } {
//     const signers = [...newConfig.signers].sort(sortByPublicKey)
//     const validatorAddress = getValidatorAddress(entryPointAddress)

//     return {
//         to: validatorAddress,
//         value: 0n,
//         data: encodeFunctionData({
//             abi: WeightedValidatorAbi,
//             functionName: "renew",
//             args: [
//                 signers.map((signer) => signer.address) ?? [],
//                 signers.map((signer) => signer.weight) ?? [],
//                 newConfig.threshold,
//                 newConfig.delay || 0
//             ]
//         })
//     }
// }

// [TODO]
// export async function getCurrentSigners<
//     entryPoint extends EntryPoint,
//     TTransport extends Transport = Transport,
//     TChain extends Chain | undefined = Chain | undefined
// >(
//     client: Client<TTransport, TChain, undefined>,
//     {
//         entryPoint: entryPointAddress,
//         multiSigAccountAddress,
//         validatorAddress
//     }: {
//         entryPoint: entryPoint
//         multiSigAccountAddress: Address
//         validatorAddress?: Address
//     }
// ): Promise<Array<{ address: Address; weight: number }>> {
//     validatorAddress =
//         validatorAddress ?? getValidatorAddress(entryPointAddress)
//     if (!validatorAddress) {
//         throw new Error("Validator address not provided")
//     }
//     const signers: Array<{ address: Address; weight: number }> = []
//     let nextGuardian: Address

//     // Fetch first guardian info from weightedStorage
//     const weightedStorage = await getAction(
//         client,
//         readContract,
//         "readContract"
//     )({
//         abi: WeightedValidatorAbi,
//         address: validatorAddress,
//         functionName: "weightedStorage",
//         args: [multiSigAccountAddress]
//     })

//     nextGuardian = weightedStorage[3]

//     // Loop until nextGuardian is the address(maxUint160) value
//     while (nextGuardian !== "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF") {
//         const guardianStorage = await getAction(
//             client,
//             readContract,
//             "readContract"
//         )({
//             abi: WeightedValidatorAbi,
//             address: validatorAddress,
//             functionName: "guardian",
//             args: [nextGuardian, multiSigAccountAddress]
//         })

//         const guardianWeight = guardianStorage[0]
//         signers.push({ address: nextGuardian, weight: guardianWeight })

//         nextGuardian = guardianStorage[1]
//     }

//     return signers
// }
