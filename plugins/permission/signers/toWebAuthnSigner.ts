import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types"
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
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type LocalAccount,
    type SignTypedDataParameters,
    type Transport,
    type TypedDataDefinition,
    getTypesForEIP712Domain,
    hashTypedData,
    validateTypedData
} from "viem"
import { type SignableMessage, encodeAbiParameters } from "viem"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage } from "viem/actions"
import {
    WEBAUTHN_SIGNER_CONTRACT_V0_0_1,
    WEBAUTHN_SIGNER_CONTRACT_V0_0_2
} from "../constants.js"
import type { ModularSigner, ModularSignerParams } from "../types.js"

export enum WebAuthnSignerVersion {
    V0_0_1 = "0.0.1",
    V0_0_2 = "0.0.2"
}

export type WebAuthnModularSignerParams = ModularSignerParams & {
    webAuthnKey: WebAuthnKey
    webAuthnSignerVersion: WebAuthnSignerVersion
}

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

export const getWebAuthnSignerAddress = (
    webAuthnSignerVersion: WebAuthnSignerVersion,
    webAuthnSignerAddress?: Address
): Address => {
    if (webAuthnSignerAddress) return webAuthnSignerAddress
    switch (webAuthnSignerVersion) {
        case WebAuthnSignerVersion.V0_0_1:
            return WEBAUTHN_SIGNER_CONTRACT_V0_0_1
        case WebAuthnSignerVersion.V0_0_2:
            return WEBAUTHN_SIGNER_CONTRACT_V0_0_2
    }
}

export const toWebAuthnSigner = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signerContractAddress,
        webAuthnKey,
        webAuthnSignerVersion
    }: WebAuthnModularSignerParams
): Promise<ModularSigner> => {
    const webAuthnSignerAddress = getWebAuthnSignerAddress(
        webAuthnSignerVersion,
        signerContractAddress
    )

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
        account,
        signerContractAddress: webAuthnSignerAddress,
        getSignerData: () => {
            return encodeAbiParameters(
                [
                    {
                        components: [
                            { name: "pubKeyX", type: "uint256" },
                            { name: "pubKeyY", type: "uint256" }
                        ],
                        name: "WebAuthnSignerData",
                        type: "tuple"
                    },
                    { name: "authenticatorIdHash", type: "bytes32" }
                ],
                [
                    { pubKeyX: webAuthnKey.pubX, pubKeyY: webAuthnKey.pubY },
                    webAuthnKey.authenticatorIdHash
                ]
            )
        },
        getDummySignature: () => {
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
                    '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false, "other_keys_can_be_added_here":"do not compare clientDataJSON against a template. See https://goo.gl/yabPex"}',
                    1n,
                    44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                    9910254599581058084911561569808925251374718953855182016200087235935345969636n,
                    false
                ]
            )
        }
    }
}
