import type { GetKernelVersion, KernelValidator } from "@zerodev/sdk/types"
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
    type LocalAccount,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    zeroAddress
} from "viem"
import { toAccount } from "viem/accounts"
import { getChainId, readContract } from "viem/actions"
import { concatHex, getAction, toHex } from "viem/utils"
import { MultiChainWeightedValidatorAbi } from "./abi.js"
import {
    MULTI_CHAIN_WEIGHTED_VALIDATOR_ADDRESS_V07,
    SIGNER_TYPE,
    decodeSignatures,
    encodeSignatures
} from "./index.js"
import type { WebAuthnKey } from "./signers/toWebAuthnSigner.js"
import { encodeWebAuthnPubKey } from "./signers/webAuthnUtils.js"

export type WeightedSigner = {
    account: LocalAccount
    getDummySignature: () => Hex
    getPublicKey: () => Hex
    type: SIGNER_TYPE
}

export interface WeightedValidatorConfig {
    threshold: number
    signers: Array<{
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
    return MULTI_CHAIN_WEIGHTED_VALIDATOR_ADDRESS_V07
}

export async function createMultiChainWeightedValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        config,
        entryPoint: entryPointAddress,
        signer,
        validatorAddress,
        kernelVersion: _
    }: {
        config?: WeightedValidatorConfig
        signer: WeightedSigner
        entryPoint: entryPoint
        kernelVersion: GetKernelVersion<entryPoint>
        validatorAddress?: Address
    }
): Promise<KernelValidator<entryPoint, "MultiChainWeightedValidator">> {
    validatorAddress =
        validatorAddress ?? getValidatorAddress(entryPointAddress)
    if (!validatorAddress) {
        throw new Error("Validator address not provided")
    }
    // Check if sum of weights is equal or greater than threshold
    let totalWeight = 0
    if (config) {
        for (const signer of config.signers) {
            totalWeight += signer.weight
        }
        if (totalWeight < config.threshold) {
            throw new Error(
                `Sum of weights (${totalWeight}) is less than threshold (${config.threshold})`
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

    // Fetch chain id
    const chainId = await getChainId(client)

    const getIndexOfSigner = () => {
        return configSigners.findIndex(
            (_signer) =>
                _signer.publicKey.toLowerCase() ===
                signer.getPublicKey().toLowerCase()
        )
    }

    const account = toAccount({
        address: zeroAddress, // note that this address is not used
        async signMessage({ message }) {
            const signature = await signer.account.signMessage({
                message
            })

            return concatHex([
                toHex(getIndexOfSigner(), { size: 1 }),
                signature
            ])
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
            const signature = await signer.account.signTypedData(typedData)

            return concatHex([
                toHex(getIndexOfSigner(), { size: 1 }),
                signature
            ])
        }
    })

    return {
        ...account,
        validatorType: "SECONDARY",
        supportedKernelVersions: ">=0.3.0",
        address: validatorAddress,
        source: "MultiChainWeightedValidator",
        getIdentifier: () =>
            validatorAddress ?? getValidatorAddress(entryPointAddress),
        async getEnableData() {
            if (!config) return "0x"
            return concatHex([
                toHex(config.threshold, { size: 3 }),
                toHex(config.delay || 0, { size: 6 }),
                encodeAbiParameters(
                    [{ name: "guardiansData", type: "bytes[]" }],
                    [
                        configSigners.map((cfg) =>
                            concatHex([
                                cfg.publicKey.length === 42
                                    ? SIGNER_TYPE.ECDSA
                                    : SIGNER_TYPE.PASSKEY,
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
            let signatures: readonly Hex[] = []
            let merkleData: Hex = "0x"
            if (userOperation.signature !== "0x") {
                ;({ merkleData, signatures } = decodeSignatures(
                    userOperation.signature
                ))
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

            const lastSignature = await account.signMessage({
                message: { raw: userOpHash }
            })

            return encodeSignatures(merkleData, [...signatures, lastSignature])
        },

        async getDummySignature(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            let signatures: readonly Hex[] = []
            let merkleData: Hex = "0x"
            if (userOperation.signature !== "0x") {
                ;({ merkleData, signatures } = decodeSignatures(
                    userOperation.signature
                ))
            }

            const lastSignature = concatHex([
                toHex(getIndexOfSigner(), { size: 1 }),
                await signer.getDummySignature()
            ])

            return encodeSignatures(merkleData, [...signatures, lastSignature])
        },

        async isEnabled(
            kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            try {
                const [_totalWeight, _threshold, _delay, _guradiansLength] =
                    await getAction(
                        client,
                        readContract,
                        "readContract"
                    )({
                        abi: MultiChainWeightedValidatorAbi,
                        address:
                            validatorAddress ??
                            getValidatorAddress(entryPointAddress),
                        functionName: "multiChainWeightedStorage",
                        args: [kernelAccountAddress]
                    })
                const guardiansStrg = await Promise.all(
                    configSigners.map(async (_, index) => {
                        return getAction(
                            client,
                            readContract,
                            "readContract"
                        )({
                            abi: MultiChainWeightedValidatorAbi,
                            address:
                                validatorAddress ??
                                getValidatorAddress(entryPointAddress),
                            functionName: "guardian",
                            args: [BigInt(index), kernelAccountAddress]
                        })
                    })
                )
                let isGuardiansSet = false
                for (const [index, signer] of configSigners.entries()) {
                    const [guardianType, weight, encodedPublicKey] =
                        guardiansStrg[index]
                    isGuardiansSet =
                        guardianType ===
                            (signer.publicKey.length === 42
                                ? SIGNER_TYPE.ECDSA
                                : SIGNER_TYPE.PASSKEY) &&
                        weight === signer.weight &&
                        encodedPublicKey.toLowerCase() ===
                            signer.publicKey.toLowerCase()
                }
                return (
                    _totalWeight === totalWeight &&
                    _threshold === config?.threshold &&
                    _delay === (config.delay || 0) &&
                    _guradiansLength === configSigners.length &&
                    isGuardiansSet
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
//     newConfig: WeightedValidatorConfig
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
//             abi: MultiChainWeightedValidatorAbi,
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
//         abi: MultiChainWeightedValidatorAbi,
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
//             abi: MultiChainWeightedValidatorAbi,
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
