import { Buffer } from "buffer"
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types"
import type { KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import {
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    type UserOperation,
    getUserOperationHash
} from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
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
    keccak256,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage } from "viem/actions"
import { getChainId } from "viem/actions"
import { getValidatorAddress } from "./index.js"
import {
    b64ToBytes,
    deserializePasskeyValidatorData,
    findQuoteIndices,
    isRIP7212SupportedNetwork,
    parseAndNormalizeSig,
    serializePasskeyValidatorData,
    uint8ArrayToHexString
} from "./utils.js"

type WebAuthnData = {
    x: bigint
    y: bigint
    usePrecompiled?: boolean // only for v0.6
}

const createEnableData = (
    pubKeyX: string,
    pubKeyY: string,
    chainId: number,
    authenticatorIdHash: Hex,
    entryPoint: EntryPoint
) => {
    const includeUsePrecompiled = entryPoint === ENTRYPOINT_ADDRESS_V06

    const webAuthnDataComponents = [
        { name: "x", type: "uint256" },
        { name: "y", type: "uint256" }
    ]

    if (includeUsePrecompiled) {
        webAuthnDataComponents.push({ name: "usePrecompiled", type: "bool" })
    }

    // Explicitly define the structure of the first element in dataToEncode as WebAuthnData
    const dataToEncode: [WebAuthnData, Hex] = [
        {
            x: BigInt(`0x${pubKeyX}`),
            y: BigInt(`0x${pubKeyY}`)
        },
        authenticatorIdHash
    ]

    if (includeUsePrecompiled) {
        dataToEncode[0].usePrecompiled = isRIP7212SupportedNetwork(chainId)
    }

    return encodeAbiParameters(
        [
            {
                components: webAuthnDataComponents,
                name: "webAuthnData",
                type: "tuple"
            },
            {
                name: "authenticatorIdHash",
                type: "bytes32"
            }
        ],
        dataToEncode
    )
}

const createDummySignatrue = (entryPoint: EntryPoint) => {
    if (entryPoint === ENTRYPOINT_ADDRESS_V06) {
        return encodeAbiParameters(
            [
                { name: "authenticatorData", type: "bytes" },
                { name: "clientDataJSON", type: "string" },
                { name: "responseTypeLocation", type: "uint256" },
                { name: "r", type: "uint256" },
                { name: "s", type: "uint256" }
            ],
            [
                "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000",
                '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false}',
                1n,
                44941127272049826721201904734628716258498742255959991581049806490182030242267n,
                9910254599581058084911561569808925251374718953855182016200087235935345969636n
            ]
        )
    }
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
}

const doSignMessage = async (
    message: SignableMessage,
    passkeyServerUrl: string,
    entryPoint: EntryPoint,
    chainId: number
) => {
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

    const signatureComponents = [
        { name: "authenticatorData", type: "bytes" },
        { name: "clientDataJSON", type: "string" },
        { name: "responseTypeLocation", type: "uint256" },
        { name: "r", type: "uint256" },
        { name: "s", type: "uint256" }
    ]

    if (entryPoint === ENTRYPOINT_ADDRESS_V07) {
        signatureComponents.push({ name: "usePrecompiled", type: "bool" })
    }

    return encodeAbiParameters(signatureComponents, [
        authenticatorDataHex,
        clientDataJSON,
        beforeType,
        BigInt(r),
        BigInt(s),
        ...(entryPoint === ENTRYPOINT_ADDRESS_V07
            ? [isRIP7212SupportedNetwork(chainId)]
            : [])
    ])
}

export async function createPasskeyValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        passkeyName,
        passkeyServerUrl,
        entryPoint: entryPointAddress = ENTRYPOINT_ADDRESS_V06 as entryPoint
    }: {
        passkeyName: string
        passkeyServerUrl: string
        entryPoint?: entryPoint
    }
): Promise<
    KernelValidator<entryPoint, "WebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const validatorAddress = getValidatorAddress(entryPointAddress)

    // Get registration options
    const registerOptionsResponse = await fetch(
        `${passkeyServerUrl}/register/options`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: passkeyName }),
            credentials: "include"
        }
    )
    const registerOptionsResult = await registerOptionsResponse.json()

    // save userId to sessionStorage
    if (window.sessionStorage === undefined) {
        throw new Error("sessionStorage is not available")
    }
    sessionStorage.setItem("userId", registerOptionsResult.userId)

    // Start registration
    const { startRegistration } = await import("@simplewebauthn/browser")
    const registerCred = await startRegistration(registerOptionsResult.options)

    // get authenticatorIdHash
    const authenticatorIdHash = keccak256(
        uint8ArrayToHexString(b64ToBytes(registerCred.id))
    )

    // Verify registration
    const registerVerifyResponse = await fetch(
        `${passkeyServerUrl}/register/verify`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: registerOptionsResult.userId,
                username: passkeyName,
                cred: registerCred
            }),
            credentials: "include"
        }
    )

    const registerVerifyResult = await registerVerifyResponse.json()
    if (!registerVerifyResult.verified) {
        throw new Error("Registration not verified")
    }

    // Import the key
    const pubKey = registerCred.response.publicKey
    if (!pubKey) {
        throw new Error("No public key returned from registration credential")
    }

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
            return doSignMessage(
                message,
                passkeyServerUrl,
                entryPointAddress,
                chainId
            )
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
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WebAuthnValidator",
        getIdentifier() {
            return validatorAddress
        },
        async getEnableData() {
            return createEnableData(
                pubKeyX,
                pubKeyY,
                chainId,
                authenticatorIdHash,
                entryPointAddress
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

            const signature = await signMessage(client, {
                account,
                message: { raw: hash }
            })
            return signature
        },
        async getDummySignature() {
            return createDummySignatrue(entryPointAddress)
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },

        getSerializedData() {
            return serializePasskeyValidatorData({
                passkeyServerUrl,
                entryPoint: entryPointAddress,
                validatorAddress,
                pubKeyX,
                pubKeyY,
                authenticatorIdHash
            })
        }
    }
}

export async function getPasskeyValidator<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        passkeyServerUrl,
        entryPoint: entryPointAddress
    }: {
        passkeyServerUrl: string
        entryPoint: entryPoint
    }
): Promise<
    KernelValidator<entryPoint, "WebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const validatorAddress = getValidatorAddress(entryPointAddress)
    // Get login options
    const loginOptionsResponse = await fetch(
        `${passkeyServerUrl}/login/options`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
        }
    )
    const loginOptions = await loginOptionsResponse.json()

    // Start authentication (login)
    const { startAuthentication } = await import("@simplewebauthn/browser")
    const loginCred = await startAuthentication(loginOptions)

    // get authenticatorIdHash
    const authenticatorIdHash = keccak256(
        uint8ArrayToHexString(b64ToBytes(loginCred.id))
    )

    // Verify authentication
    const loginVerifyResponse = await fetch(
        `${passkeyServerUrl}/login/verify`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cred: loginCred }),
            credentials: "include"
        }
    )

    const loginVerifyResult = await loginVerifyResponse.json()
    if (!loginVerifyResult.verification.verified) {
        throw new Error("Login not verified")
    }

    if (window.sessionStorage === undefined) {
        throw new Error("sessionStorage is not available")
    }
    sessionStorage.setItem("userId", loginVerifyResult.userId)

    // Import the key
    const pubKey = loginVerifyResult.pubkey // Uint8Array pubkey
    if (!pubKey) {
        throw new Error("No public key returned from login verify credential")
    }

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
            return doSignMessage(
                message,
                passkeyServerUrl,
                entryPointAddress,
                chainId
            )
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
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WebAuthnValidator",
        getIdentifier: () =>
            validatorAddress ?? getValidatorAddress(entryPointAddress),
        async getEnableData() {
            return createEnableData(
                pubKeyX,
                pubKeyY,
                chainId,
                authenticatorIdHash,
                entryPointAddress
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
            return createDummySignatrue(entryPointAddress)
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },
        getSerializedData() {
            return serializePasskeyValidatorData({
                passkeyServerUrl,
                entryPoint: entryPointAddress,
                validatorAddress,
                pubKeyX,
                pubKeyY,
                authenticatorIdHash
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
        entryPoint: entryPointAddress
    }: {
        serializedData: string
        entryPoint: entryPoint
    }
): Promise<
    KernelValidator<entryPoint, "WebAuthnValidator"> & {
        getSerializedData: () => string
    }
> {
    const {
        passkeyServerUrl,
        entryPoint,
        validatorAddress,
        pubKeyX,
        pubKeyY,
        authenticatorIdHash
    } = deserializePasskeyValidatorData(serializedData)

    // Fetch chain id
    const chainId = await getChainId(client)

    // build account with passkey
    const account: LocalAccount = toAccount({
        // note that this address will be overwritten by actual address
        address: "0x0000000000000000000000000000000000000000",
        async signMessage({ message }) {
            return doSignMessage(
                message,
                passkeyServerUrl,
                entryPointAddress,
                chainId
            )
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
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "WebAuthnValidator",
        getIdentifier: () => validatorAddress,
        async getEnableData() {
            return createEnableData(
                pubKeyX,
                pubKeyY,
                chainId,
                authenticatorIdHash,
                entryPointAddress
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
            return createDummySignatrue(entryPointAddress)
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        },
        getSerializedData() {
            return serializePasskeyValidatorData({
                passkeyServerUrl,
                entryPoint,
                validatorAddress,
                pubKeyX,
                pubKeyY,
                authenticatorIdHash
            })
        }
    }
}
