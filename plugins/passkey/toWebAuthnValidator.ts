import { Buffer } from "buffer"
import { startAuthentication } from "@simplewebauthn/browser"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { KERNEL_ADDRESSES } from "@zerodev/sdk"
import type { KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import { type UserOperation, getUserOperationHash } from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type SignTypedDataParameters,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    getTypesForEIP712Domain,
    hashTypedData,
    maxUint256,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage } from "viem/actions"
import { getChainId } from "viem/actions"
import { WEBAUTHN_VALIDATOR_ADDRESS } from "./index.js"
import {
    b64ToBytes,
    findQuoteIndices,
    hexStringToUint8Array,
    isRip7212SupportedNetwork,
    parseAndNormalizeSig,
    uint8ArrayToHexString
} from "./utils.js"

export async function createPasskeyValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        rpID,
        pubKey,
        authenticatorId,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        validatorAddress = WEBAUTHN_VALIDATOR_ADDRESS
    }: {
        rpID: string
        pubKey: string // Base64URLString from the registration response
        authenticatorId: string
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<KernelValidator<"WebAuthnValidator">> {
    // Import the public key
    const spkiDer = Buffer.from(pubKey, "base64")
    const key = await crypto.subtle.importKey(
        "spki",
        spkiDer,
        {
            name: "ECDSA",
            namedCurve: "P-256"
        },
        true,
        ["verify"]
    )

    // Export the key to the raw format
    const rawKey = await crypto.subtle.exportKey("raw", key)
    const rawKeyBuffer = Buffer.from(rawKey)

    // The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
    const pubKeyX = rawKeyBuffer.subarray(1, 33).toString("hex")
    const pubKeyY = rawKeyBuffer.subarray(33).toString("hex")

    // Fetch chain id
    const chainId = await getChainId(client)

    // build account with passkey
    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            // convert SignMessage to string
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

            // Convert data (hex string) to Uint8Array
            const dataUint8Array = hexStringToUint8Array(formattedMessage)

            // prepare assertion options
            const authOptions = await generateAuthenticationOptions({
                challenge: dataUint8Array,
                userVerification: "required",
                rpID,
                allowCredentials: [
                    {
                        id: b64ToBytes(authenticatorId),
                        type: "public-key"
                    }
                ]
            })

            // start authentication (signing)
            const cred = await startAuthentication(authOptions)

            // get authenticator data
            const authenticatorData = cred.response.authenticatorData
            const authenticatorDataHex = uint8ArrayToHexString(
                b64ToBytes(authenticatorData)
            )

            // get client data JSON
            const clientDataJSON = atob(cred.response.clientDataJSON)

            // get challenge and response type location
            const { beforeType, beforeChallenge } =
                findQuoteIndices(clientDataJSON)

            // get signature r,s
            const signature = cred.response.signature
            const signatureHex = uint8ArrayToHexString(b64ToBytes(signature))
            const { r, s } = parseAndNormalizeSig(signatureHex)

            // encode signature
            const encodedSignature = encodeAbiParameters(
                [
                    { name: "authenticatorData", type: "bytes" },
                    { name: "clientDataJSON", type: "string" },
                    { name: "challengeLocation", type: "uint256" },
                    { name: "responseTypeLocation", type: "uint256" },
                    { name: "r", type: "uint256" },
                    { name: "s", type: "uint256" },
                    { name: "usePrecompiled", type: "bool" }
                ],
                [
                    authenticatorDataHex,
                    clientDataJSON,
                    beforeChallenge,
                    beforeType,
                    BigInt(r),
                    BigInt(s),
                    isRip7212SupportedNetwork(chainId)
                ]
            )
            return encodedSignature
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
            const { domain, message, primaryType } =
                typedData as unknown as SignTypedDataParameters

            const types = {
                EIP712Domain: getTypesForEIP712Domain({ domain }),
                ...typedData.types
            }

            validateTypedData({ domain, message, primaryType, types })

            const hash = hashTypedData(typedData)
            const signature = await signMessage(client, {
                account,
                message: hash
            })
            return signature
        }
    })

    return {
        ...account,
        address: validatorAddress,
        source: "WebAuthnValidator",
        async getEnableData() {
            return encodeAbiParameters(
                [
                    {
                        components: [
                            {
                                name: "x",
                                type: "uint256"
                            },
                            {
                                name: "y",
                                type: "uint256"
                            }
                        ],
                        name: "pubKey",
                        type: "tuple"
                    }
                ],
                [{ x: BigInt(`0x${pubKeyX}`), y: BigInt(`0x${pubKeyY}`) }]
            )
        },
        async getNonceKey() {
            return 0n
        },
        async signUserOperation(userOperation: UserOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPoint,
                chainId: chainId
            })

            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })
            return signature
        },
        async getDummySignature() {
            const encodedSignature = encodeAbiParameters(
                [
                    { name: "authenticatorData", type: "bytes" },
                    { name: "clientDataJSON", type: "string" },
                    { name: "challengeLocation", type: "uint256" },
                    { name: "responseTypeLocation", type: "uint256" },
                    { name: "r", type: "uint256" },
                    { name: "s", type: "uint256" },
                    { name: "usePrecompiled", type: "bool" }
                ],
                [
                    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                    '{"type":"webauthn.get","challenge":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","origin":"https://example.com"}',
                    maxUint256,
                    maxUint256,
                    11111111111111111111111111111111111111111111111111111111111111111111111111111n,
                    22222222222222222222222222222222222222222222222222222222222222222222222222222n,
                    false
                ]
            )
            return encodedSignature
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}

export async function getPasskeyValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        rpID,
        pubKeyX,
        pubKeyY,
        authenticatorId,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        validatorAddress = WEBAUTHN_VALIDATOR_ADDRESS
    }: {
        rpID: string
        pubKeyX: bigint // pubKeyX arg from the event log
        pubKeyY: bigint // pubKeyY arg from the event log
        authenticatorId: string
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<KernelValidator<"WebAuthnValidator">> {
    // Fetch chain id
    const chainId = await getChainId(client)

    // build account with passkey
    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            // convert SignMessage to string
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

            // Convert data (hex string) to Uint8Array
            const dataUint8Array = hexStringToUint8Array(formattedMessage)

            const authOptions = await generateAuthenticationOptions({
                challenge: dataUint8Array,
                userVerification: "required",
                rpID,
                allowCredentials: [
                    {
                        id: b64ToBytes(authenticatorId),
                        type: "public-key"
                    }
                ]
            })

            // start authentication (signing)
            const cred = await startAuthentication(authOptions)

            // get authenticator data
            const authenticatorData = cred.response.authenticatorData
            const authenticatorDataHex = uint8ArrayToHexString(
                b64ToBytes(authenticatorData)
            )

            // get client data JSON
            const clientDataJSON = atob(cred.response.clientDataJSON)

            // get challenge and response type location
            const { beforeType, beforeChallenge } =
                findQuoteIndices(clientDataJSON)

            // get signature r,s
            const signature = cred.response.signature
            const signatureHex = uint8ArrayToHexString(b64ToBytes(signature))
            const { r, s } = parseAndNormalizeSig(signatureHex)

            // encode signature
            const encodedSignature = encodeAbiParameters(
                [
                    { name: "authenticatorData", type: "bytes" },
                    { name: "clientDataJSON", type: "string" },
                    { name: "challengeLocation", type: "uint256" },
                    { name: "responseTypeLocation", type: "uint256" },
                    { name: "r", type: "uint256" },
                    { name: "s", type: "uint256" },
                    { name: "usePrecompiled", type: "bool" }
                ],
                [
                    authenticatorDataHex,
                    clientDataJSON,
                    beforeChallenge,
                    beforeType,
                    BigInt(r),
                    BigInt(s),
                    isRip7212SupportedNetwork(chainId)
                ]
            )
            return encodedSignature
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
            const { domain, message, primaryType } =
                typedData as unknown as SignTypedDataParameters

            const types = {
                EIP712Domain: getTypesForEIP712Domain({ domain }),
                ...typedData.types
            }

            validateTypedData({ domain, message, primaryType, types })

            const hash = hashTypedData(typedData)
            const signature = await signMessage(client, {
                account,
                message: hash
            })
            return signature
        }
    })

    return {
        ...account,
        address: validatorAddress,
        source: "WebAuthnValidator",
        async getEnableData() {
            return encodeAbiParameters(
                [
                    {
                        components: [
                            {
                                name: "x",
                                type: "uint256"
                            },
                            {
                                name: "y",
                                type: "uint256"
                            }
                        ],
                        name: "pubKey",
                        type: "tuple"
                    }
                ],
                [{ x: pubKeyX, y: pubKeyY }]
            )
        },
        async getNonceKey() {
            return 0n
        },
        async signUserOperation(userOperation: UserOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPoint,
                chainId: chainId
            })

            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })
            return signature
        },
        async getDummySignature() {
            const encodedSignature = encodeAbiParameters(
                [
                    { name: "authenticatorData", type: "bytes" },
                    { name: "clientDataJSON", type: "string" },
                    { name: "challengeLocation", type: "uint256" },
                    { name: "responseTypeLocation", type: "uint256" },
                    { name: "r", type: "uint256" },
                    { name: "s", type: "uint256" },
                    { name: "usePrecompiled", type: "bool" }
                ],
                [
                    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                    '{"type":"webauthn.get","challenge":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","origin":"https://example.com"}',
                    maxUint256,
                    maxUint256,
                    11111111111111111111111111111111111111111111111111111111111111111111111111111n,
                    22222222222222222222222222222222222222222222222222222222222222222222222222222n,
                    false
                ]
            )
            return encodedSignature
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}
