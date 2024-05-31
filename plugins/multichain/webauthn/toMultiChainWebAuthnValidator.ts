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
import { getChainId, signMessage } from "viem/actions"
import { MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS } from "../constants.js"
import type { WebAuthnKey } from "./toWebAuthnAccount.js"
import {
    b64ToBytes,
    findQuoteIndices,
    isRIP7212SupportedNetwork,
    parseAndNormalizeSig,
    uint8ArrayToHexString
} from "./webAuthnUtils.js"

export async function toMultiChainWebAuthnValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        passkeyServerUrl,
        webAuthnKey,
        entryPoint: entryPointAddress,
        kernelVersion: _,
        validatorAddress
    }: {
        passkeyServerUrl: string
        webAuthnKey: WebAuthnKey
        entryPoint: entryPoint
        kernelVersion: GetKernelVersion<entryPoint>
        validatorAddress?: Address
    }
): Promise<KernelValidator<entryPoint, "MultiChainWebAuthnValidator">> {
    validatorAddress =
        validatorAddress ?? MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS

    // Fetch chain id
    const chainId = await getChainId(client)

    const signMessageUsingWebAuthn = async (message: SignableMessage) => {
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

        if (window.sessionStorage === undefined) {
            throw new Error("sessionStorage is not available")
        }
        const userId = sessionStorage.getItem("userId")

        // initiate signing
        const signInitiateResponse = await fetch(
            `${passkeyServerUrl}/sign-initiate`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: formattedMessage, userId }),
                credentials: "include"
            }
        )
        const signInitiateResult = await signInitiateResponse.json()

        // prepare assertion options
        const assertionOptions: PublicKeyCredentialRequestOptionsJSON = {
            challenge: signInitiateResult.challenge,
            allowCredentials: signInitiateResult.allowCredentials,
            userVerification: "required"
        }

        // start authentication (signing)

        const { startAuthentication } = await import("@simplewebauthn/browser")
        const cred = await startAuthentication(assertionOptions)

        // verify signature from server
        const verifyResponse = await fetch(`${passkeyServerUrl}/sign-verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cred, userId }),
            credentials: "include"
        })

        const verifyResult = await verifyResponse.json()

        if (!verifyResult.success) {
            throw new Error("Signature not verified")
        }

        // get authenticator data
        const authenticatorData = verifyResult.authenticatorData
        const authenticatorDataHex = uint8ArrayToHexString(
            b64ToBytes(authenticatorData)
        )

        // get client data JSON
        const clientDataJSON = atob(cred.response.clientDataJSON)

        // get challenge and response type location
        const { beforeType } = findQuoteIndices(clientDataJSON)

        // get signature r,s
        const signature = verifyResult.signature
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

    const account = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            return signMessageUsingWebAuthn(message)
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
            return signMessageUsingWebAuthn(hash)
        }
    })

    return {
        ...account,
        supportedKernelVersions: ">=0.3.0-beta",
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "MultiChainWebAuthnValidator",
        getIdentifier() {
            return validatorAddress ?? MULTI_CHAIN_WEBAUTHN_VALIDATOR_ADDRESS
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
            const hash = getUserOperationHash<entryPoint>({
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
        async getDummySignature(_userOperation) {
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
        }
    }
}
