import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types"
import type { GetKernelVersion, KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import { type UserOperation, getUserOperationHash } from "permissionless"
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
    type SignTypedDataParameters,
    type SignableMessage,
    type Transport,
    type TypedDataDefinition,
    encodeAbiParameters,
    getTypesForEIP712Domain,
    hashTypedData,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage } from "viem/actions"
import { getChainId } from "viem/actions"
import { getValidatorAddress } from "./index.js"
import type { WebAuthnKey } from "./toWebAuthnKey.js"
import {
    b64ToBytes,
    base64FromUint8Array,
    deserializePasskeyValidatorData,
    findQuoteIndices,
    hexStringToUint8Array,
    isRIP7212SupportedNetwork,
    parseAndNormalizeSig,
    serializePasskeyValidatorData,
    uint8ArrayToHexString
} from "./utils.js"

const signMessageUsingWebAuthn = async (
    message: SignableMessage,
    chainId: number,
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
        userVerification: "required"
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

export async function toPasskeyValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        webAuthnKey,
        entryPoint: entryPointAddress,
        kernelVersion,
        validatorAddress: _validatorAddress,
        credentials = "include"
    }: {
        webAuthnKey: WebAuthnKey
        entryPoint: entryPoint
        kernelVersion: GetKernelVersion<entryPoint>
        validatorAddress?: Address
        credentials?: RequestCredentials
    }
): Promise<
    KernelValidator<entryPoint, "WebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const validatorAddress = getValidatorAddress(
        entryPointAddress,
        kernelVersion,
        _validatorAddress
    )
    // Fetch chain id
    const chainId = await getChainId(client)

    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            return signMessageUsingWebAuthn(message, chainId, [
                { id: webAuthnKey.authenticatorId, type: "public-key" }
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
        supportedKernelVersions: kernelVersion,
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WebAuthnValidator",
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
        async signUserOperation(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPointAddress,
                chainId: chainId
            })

            const signature: Hex = await signMessage(client, {
                account,
                message: { raw: hash }
            })
            return signature
        },
        async getDummySignature() {
            return encodeAbiParameters(
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
                    '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false}',
                    1n,
                    44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                    9910254599581058084911561569808925251374718953855182016200087235935345969636n,
                    false
                ]
            )
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },

        getSerializedData() {
            if (window.sessionStorage === undefined) {
                throw new Error("sessionStorage is not available")
            }
            const userId = sessionStorage.getItem("userId")
            return serializePasskeyValidatorData({
                credentials,
                entryPoint: entryPointAddress,
                validatorAddress,
                pubKeyX: webAuthnKey.pubX,
                pubKeyY: webAuthnKey.pubY,
                authenticatorId: webAuthnKey.authenticatorId,
                authenticatorIdHash: webAuthnKey.authenticatorIdHash,
                userId: userId ?? ""
            })
        }
    }
}

export async function deserializePasskeyValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        serializedData,
        entryPoint: entryPointAddress,
        kernelVersion
    }: {
        serializedData: string
        entryPoint: entryPoint
        kernelVersion: GetKernelVersion<entryPoint>
    }
): Promise<
    KernelValidator<entryPoint, "WebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const {
        credentials,
        entryPoint,
        validatorAddress,
        pubKeyX,
        pubKeyY,
        authenticatorId,
        authenticatorIdHash
    } = deserializePasskeyValidatorData(serializedData)

    // Fetch chain id
    const chainId = await getChainId(client)

    // build account with passkey
    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            return signMessageUsingWebAuthn(message, chainId, [
                { id: authenticatorId, type: "public-key" }
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
        supportedKernelVersions: kernelVersion,
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WebAuthnValidator",
        getIdentifier: () => validatorAddress,
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
        async getNonceKey() {
            return 0n
        },
        async signUserOperation(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPointAddress,
                chainId: chainId
            })

            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })
            return signature
        },
        async getDummySignature() {
            return encodeAbiParameters(
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
                    '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false}',
                    1n,
                    44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                    9910254599581058084911561569808925251374718953855182016200087235935345969636n,
                    false
                ]
            )
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },
        getSerializedData() {
            if (window.sessionStorage === undefined) {
                throw new Error("sessionStorage is not available")
            }
            const userId = sessionStorage.getItem("userId")
            return serializePasskeyValidatorData({
                credentials,
                entryPoint,
                validatorAddress,
                pubKeyX,
                pubKeyY,
                authenticatorId,
                authenticatorIdHash,
                userId: userId ?? ""
            })
        }
    }
}
