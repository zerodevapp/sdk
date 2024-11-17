import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator
} from "@zerodev/sdk/types"
import type { WebAuthnKey } from "@zerodev/webauthn-key"
import type { TypedData } from "abitype"
import {
    type Address,
    type Client,
    type Hex,
    type LocalAccount,
    type TypedDataDefinition,
    encodeAbiParameters,
    zeroAddress
} from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, readContract } from "viem/actions"
import { concatHex, getAction, toHex } from "viem/utils"
import { WeightedValidatorAbi } from "./abi.js"
import {
    SIGNER_TYPE,
    WEIGHTED_VALIDATOR_ADDRESS_V07,
    decodeSignatures,
    encodeSignatures,
    sortByPublicKey
} from "./index.js"
import { encodeWebAuthnPubKey } from "./signers/toWebAuthnSigner.js"

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

export const getValidatorAddress = (
    entryPointVersion: EntryPointVersion
): Address => {
    if (entryPointVersion === "0.6")
        throw new Error("EntryPoint v0.6 not supported")
    return WEIGHTED_VALIDATOR_ADDRESS_V07
}

export async function createWeightedValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        config,
        entryPoint,
        kernelVersion: _,
        signer,
        validatorAddress: validatorAddress_
    }: {
        config?: WeightedValidatorConfig
        signer: WeightedSigner
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
        validatorAddress?: Address
    }
): Promise<KernelValidator<"WeightedValidator">> {
    const validatorAddress =
        validatorAddress_ ?? getValidatorAddress(entryPoint.version)
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
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
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
        supportedKernelVersions: ">=0.3.0",
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WeightedValidator",
        getIdentifier: () => validatorAddress,
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
        async signUserOperation(userOperation) {
            let signatures: readonly Hex[] = []
            if (userOperation.signature !== "0x") {
                signatures = decodeSignatures(userOperation.signature)
            }
            // last signer signs for userOpHash
            const userOpHash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })

            const lastSignature = await account.signMessage({
                message: { raw: userOpHash }
            })

            return encodeSignatures([...signatures, lastSignature])
        },

        async getStubSignature(userOperation) {
            let signatures: readonly Hex[] = []
            if (userOperation.signature !== "0x") {
                console.log(userOperation.signature)
                signatures = decodeSignatures(userOperation.signature)
            }

            const lastSignature = concatHex([
                toHex(getIndexOfSigner(), { size: 1 }),
                await signer.getDummySignature()
            ])

            return encodeSignatures([...signatures, lastSignature])
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
                        abi: WeightedValidatorAbi,
                        address: validatorAddress,
                        functionName: "weightedStorage",
                        args: [kernelAccountAddress]
                    })
                const guardiansStrg = await Promise.all(
                    configSigners.map(async (_, index) => {
                        return getAction(
                            client,
                            readContract,
                            "readContract"
                        )({
                            abi: WeightedValidatorAbi,
                            address: validatorAddress,
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
