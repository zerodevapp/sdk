import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types"
import { SignTransactionNotSupportedBySmartAccountError } from "@zerodev/sdk"
import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator
} from "@zerodev/sdk/types"
import type { WebAuthnKey } from "@zerodev/webauthn-key"
import {
    b64ToBytes,
    base64FromUint8Array,
    findQuoteIndices,
    hexStringToUint8Array,
    isRIP7212SupportedNetwork,
    parseAndNormalizeSig,
    uint8ArrayToHexString
} from "@zerodev/webauthn-key"
import type { TypedData } from "abitype"
import {MerkleTree} from "merkletreejs"
import {
    type Address,
    type Client,
    type Hex,
    type LocalAccount,
    type SignTypedDataParameters,
    type SignableMessage,
    type TypedDataDefinition,
    encodeAbiParameters,
    getTypesForEIP712Domain,
    hashTypedData,
    validateTypedData
} from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage } from "viem/actions"
import { concatHex, hashMessage, keccak256 } from "viem/utils"
import { MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS } from "./constants.js"
import { webauthnGetMultiUserOpDummySignature } from "./utils/webauthnGetMultiUserOpDummySignature.js"

const signWebauthnHashes = async (
    hashes: Hex[],
    chainId: number,
    webAuthnKey?: WebAuthnKey,
    rpId?: string,
    allowCredentials?: PublicKeyCredentialRequestOptionsJSON["allowCredentials"]
) => {
    const merkleTree = new MerkleTree(hashes, keccak256, {
        sortPairs: true
    })

    const merkleRoot = merkleTree.getHexRoot() as Hex
    const toEthSignedMessageHash = hashMessage({ raw: merkleRoot })

    const passkeySig = webAuthnKey?.signMessageCallback
        ? await webAuthnKey.signMessageCallback(
              { raw: toEthSignedMessageHash },
              webAuthnKey.rpID,
              chainId,
              [{ id: webAuthnKey.authenticatorId, type: "public-key" }]
          )
        : await signMessageUsingWebAuthn(
              { raw: toEthSignedMessageHash },
              chainId,
              rpId,
              allowCredentials
          )

    const encodeMerkleDataWithSig = (userOpHash: Hex) => {
        const merkleProof = merkleTree.getHexProof(userOpHash) as Hex[]

        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "proof", type: "bytes32[]" }],
            [merkleProof]
        )
        const merkleData = concatHex([merkleRoot, encodedMerkleProof])
        return encodeAbiParameters(
            [
                {
                    name: "merkleData",
                    type: "bytes"
                },
                {
                    name: "signature",
                    type: "bytes"
                }
            ],
            [merkleData, passkeySig]
        )
    }

    return hashes.map((hash) => encodeMerkleDataWithSig(hash))
}

const signMessageUsingWebAuthn = async (
    message: SignableMessage,
    chainId: number,
    rpId?: string,
    allowCredentials?: PublicKeyCredentialRequestOptionsJSON["allowCredentials"]
) => {
    let messageContent: string
    if (typeof message === "string") {
        // message is a string
        messageContent = message
    } else if ("raw" in message && typeof message.raw === "string") {
        // message.raw is a Hex string
        messageContent = message.raw
    } else if ("raw" in message && message.raw instanceof Uint8Array) {
        // message.raw is a ByteArray
        messageContent = message.raw.toString()
    } else {
        throw new Error("Unsupported message format")
    }

    // remove 0x prefix if present
    const formattedMessage = messageContent.startsWith("0x")
        ? messageContent.slice(2)
        : messageContent

    const challenge = base64FromUint8Array(
        hexStringToUint8Array(formattedMessage),
        true
    )

    // prepare assertion options
    const assertionOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge,
        allowCredentials,
        userVerification: "required",
        rpId
    }

    // start authentication (signing)

    const { startAuthentication } = await import("@simplewebauthn/browser")
    const cred = await startAuthentication(assertionOptions)

    // get authenticator data
    const { authenticatorData } = cred.response
    const authenticatorDataHex = uint8ArrayToHexString(
        b64ToBytes(authenticatorData)
    )

    // get client data JSON
    const clientDataJSON = atob(cred.response.clientDataJSON)

    // get challenge and response type location
    const { beforeType } = findQuoteIndices(clientDataJSON)

    // get signature r,s
    const { signature } = cred.response
    const signatureHex = uint8ArrayToHexString(b64ToBytes(signature))
    const { r, s } = parseAndNormalizeSig(signatureHex)

    // encode signature
    const encodedSignature = encodeAbiParameters(
        [
            { name: "authenticatorData", type: "bytes" },
            { name: "clientDataJSON", type: "string" },
            { name: "responseTypeLocation", type: "uint256" },
            { name: "r", type: "uint256" },
            { name: "s", type: "uint256" },
            { name: "usePrecompiled", type: "bool" }
        ],
        [
            authenticatorDataHex,
            clientDataJSON,
            beforeType,
            BigInt(r),
            BigInt(s),
            isRIP7212SupportedNetwork(chainId)
        ]
    )

    return encodedSignature
}

export async function toMultiChainWebAuthnValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        webAuthnKey,
        entryPoint,
        kernelVersion: _,
        rpId,
        validatorAddress,
        multiChainIds
    }: {
        webAuthnKey: WebAuthnKey
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
        rpId?: string
        validatorAddress?: Address
        multiChainIds?: number[]
    }
): Promise<
    KernelValidator<"MultiChainWebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const currentValidatorAddress =
        validatorAddress ?? MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS

    // Fetch chain id
    const chainId = await getChainId(client)

    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }, options?:{raw?:boolean}) {
            console.log("215")
            let messageContent: string
            if (typeof message === "string") {
                // message is a string
                messageContent = message
            } else if ("raw" in message && typeof message.raw === "string") {
                // message.raw is a Hex string
                messageContent = message.raw
            } else if ("raw" in message && message.raw instanceof Uint8Array) {
                // message.raw is a ByteArray
                messageContent = message.raw.toString()
            } else {
                throw new Error("Unsupported message format")
            }
        
            const hash = messageContent as Hex
            console.log("hash", hash)
            return (await signWebauthnHashes([hash], chainId, webAuthnKey, rpId, [
                { id: webAuthnKey.authenticatorId, type: "public-key" }
            ]))[0]
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccountError()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            const { domain, message, primaryType } =
                typedData as unknown as SignTypedDataParameters

            const types = {
                EIP712Domain: getTypesForEIP712Domain({ domain }),
                ...typedData.types
            }

            validateTypedData({ domain, message, primaryType, types })

            const hash = hashTypedData(typedData)
            console.log("SignTypedData", hash)
            const signature = await signWebauthnHashes(
                [hash],
                chainId,
                webAuthnKey,
                rpId,
                [{ id: webAuthnKey.authenticatorId, type: "public-key" }]
            )
            console.log("SignTypedData.signature", signature)
            return signature[0]
        }
    })

    return {
        ...account,
        supportedKernelVersions: ">=0.3.0",
        validatorType: "SECONDARY",
        address: currentValidatorAddress,
        source: "MultiChainWebAuthnValidator",
        getIdentifier() {
            return (
                currentValidatorAddress ??
                MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS
            )
        },
        async getEnableData() {
            return encodeAbiParameters(
                [
                    {
                        components: [
                            { name: "x", type: "uint256" },
                            { name: "y", type: "uint256" }
                        ],
                        name: "webAuthnData",
                        type: "tuple"
                    },
                    {
                        name: "authenticatorIdHash",
                        type: "bytes32"
                    }
                ],
                [
                    {
                        x: webAuthnKey.pubX,
                        y: webAuthnKey.pubY
                    },
                    webAuthnKey.authenticatorIdHash
                ]
            )
        },
        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })

            const encodedSignature = encodeAbiParameters(
                [
                    {
                        name: "merkleData",
                        type: "bytes"
                    },
                    {
                        name: "signature",
                        type: "bytes"
                    }
                ],
                ["0x", signature]
            )

            return encodedSignature
        },
        async getStubSignature(userOperation) {
            if (!multiChainIds) {
                const signature = encodeAbiParameters(
                    [
                        { name: "authenticatorData", type: "bytes" },
                        { name: "clientDataJSON", type: "string" },
                        { name: "responseTypeLocation", type: "uint256" },
                        { name: "r", type: "uint256" },
                        { name: "s", type: "uint256" },
                        { name: "usePrecompiled", type: "bool" }
                    ],
                    [
                        "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000",
                        '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false, "other_keys_can_be_added_here":"do not compare clientDataJSON against a template. See https://goo.gl/yabPex"}',
                        1n,
                        44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                        9910254599581058084911561569808925251374718953855182016200087235935345969636n,
                        false
                    ]
                )

                return encodeAbiParameters(
                    [
                        { name: "merkleData", type: "bytes" },
                        { name: "signature", type: "bytes" }
                    ],
                    ["0x", signature]
                )
            }
            return webauthnGetMultiUserOpDummySignature(
                {
                    ...userOperation,
                    callGasLimit: 0n,
                    preVerificationGas: 0n,
                    verificationGasLimit: 0n
                } as UserOperation,
                multiChainIds.length,
                entryPoint,
                chainId
            )
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },
        getSerializedData() {
            return serializeMultiChainWebAuthnValidatorData({
                entryPoint,
                validatorAddress: currentValidatorAddress,
                pubKeyX: webAuthnKey.pubX,
                pubKeyY: webAuthnKey.pubY,
                authenticatorId: webAuthnKey.authenticatorId,
                authenticatorIdHash: webAuthnKey.authenticatorIdHash,
                rpId,
                multiChainIds
            })
        }
    }
}

export async function deserializeMultiChainWebAuthnValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        serializedData,
        entryPoint: _,
        kernelVersion
    }: {
        serializedData: string
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
    }
): Promise<
    KernelValidator<"MultiChainWebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const {
        entryPoint,
        validatorAddress,
        pubKeyX,
        pubKeyY,
        authenticatorId,
        authenticatorIdHash,
        rpId,
        multiChainIds
    } = deserializeMultiChainWebAuthnValidatorData(serializedData)

    // Fetch chain id
    const chainId = await getChainId(client)

    // Build account with WebAuthn key
    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            console.log("432")
            return signMessageUsingWebAuthn(message, chainId, rpId, [
                { id: authenticatorId, type: "public-key" }
            ])
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccountError()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            const { domain, message, primaryType } =
                typedData as unknown as SignTypedDataParameters

            const types = {
                EIP712Domain: getTypesForEIP712Domain({ domain }),
                ...typedData.types
            }

            validateTypedData({ domain, message, primaryType, types })

            const hash = hashTypedData(typedData)
            const signature = await signWebauthnHashes(
                [hash],
                chainId,
                undefined,
                rpId,
                [{ id: authenticatorId, type: "public-key" }]
            )
            return signature[0]
        }
    })

    return {
        ...account,
        supportedKernelVersions: kernelVersion,
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "MultiChainWebAuthnValidator",
        getIdentifier() {
            return validatorAddress
        },
        async getEnableData() {
            return encodeAbiParameters(
                [
                    {
                        components: [
                            { name: "x", type: "uint256" },
                            { name: "y", type: "uint256" }
                        ],
                        name: "webAuthnData",
                        type: "tuple"
                    },
                    {
                        name: "authenticatorIdHash",
                        type: "bytes32"
                    }
                ],
                [
                    {
                        x: pubKeyX,
                        y: pubKeyY
                    },
                    authenticatorIdHash
                ]
            )
        },
        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })

            const encodedSignature = encodeAbiParameters(
                [
                    {
                        name: "merkleData",
                        type: "bytes"
                    },
                    {
                        name: "signature",
                        type: "bytes"
                    }
                ],
                ["0x", signature]
            )

            return encodedSignature
        },
        async getStubSignature(userOperation) {
            if (!multiChainIds) {
                const signature = encodeAbiParameters(
                    [
                        { name: "authenticatorData", type: "bytes" },
                        { name: "clientDataJSON", type: "string" },
                        { name: "responseTypeLocation", type: "uint256" },
                        { name: "r", type: "uint256" },
                        { name: "s", type: "uint256" },
                        { name: "usePrecompiled", type: "bool" }
                    ],
                    [
                        "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000",
                        '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false, "other_keys_can_be_added_here":"do not compare clientDataJSON against a template. See https://goo.gl/yabPex"}',
                        1n,
                        44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                        9910254599581058084911561569808925251374718953855182016200087235935345969636n,
                        false
                    ]
                )

                return encodeAbiParameters(
                    [
                        { name: "merkleData", type: "bytes" },
                        { name: "signature", type: "bytes" }
                    ],
                    ["0x", signature]
                )
            }

            return webauthnGetMultiUserOpDummySignature(
                {
                    ...userOperation,
                    callGasLimit: 0n,
                    preVerificationGas: 0n,
                    verificationGasLimit: 0n
                } as UserOperation,
                multiChainIds.length,
                entryPoint,
                chainId
            )
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },
        getSerializedData() {
            return serializeMultiChainWebAuthnValidatorData({
                entryPoint,
                validatorAddress,
                pubKeyX,
                pubKeyY,
                authenticatorId,
                authenticatorIdHash,
                rpId
            })
        }
    }
}

type MultiChainWebAuthnValidatorSerializedData = {
    entryPoint: EntryPointType<EntryPointVersion>
    validatorAddress: Address
    pubKeyX: bigint
    pubKeyY: bigint
    authenticatorId: string
    authenticatorIdHash: Hex
    rpId?: string
    multiChainIds?: number[]
}

function serializeMultiChainWebAuthnValidatorData(
    params: MultiChainWebAuthnValidatorSerializedData
): string {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const replacer = (_: string, value: any) => {
        if (typeof value === "bigint") {
            return value.toString()
        }
        if (value instanceof Uint8Array) {
            return Array.from(value)
        }
        return value
    }

    const jsonString = JSON.stringify(params, replacer)
    const uint8Array = new TextEncoder().encode(jsonString)
    return bytesToBase64(uint8Array)
}

function deserializeMultiChainWebAuthnValidatorData(
    serializedData: string
): MultiChainWebAuthnValidatorSerializedData {
    const uint8Array = base64ToBytes(serializedData)
    const jsonString = new TextDecoder().decode(uint8Array)
    const parsed = JSON.parse(jsonString, (_, value) => {
        if (
            Array.isArray(value) &&
            value.every((item) => typeof item === "number")
        ) {
            return new Uint8Array(value)
        }
        if (typeof value === "string" && /^\d+$/.test(value)) {
            return BigInt(value)
        }
        return value
    })
    return parsed
}

function base64ToBytes(base64: string): Uint8Array {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number)
}

function bytesToBase64(bytes: Uint8Array): string {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
    return btoa(binString)
}
