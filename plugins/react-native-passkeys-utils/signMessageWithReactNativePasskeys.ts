import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types"
import * as passkey from "react-native-passkeys"
import { type SignableMessage, encodeAbiParameters } from "viem"

import {
    b64ToBytes,
    base64FromUint8Array,
    findQuoteIndices,
    hexStringToUint8Array,
    isRIP7212SupportedNetwork,
    parseAndNormalizeSig,
    uint8ArrayToHexString
} from "./utils"

export async function signMessageWithReactNativePasskeys(
    message: SignableMessage,
    rpID: string,
    chainId: number,
    allowCredentials?: PublicKeyCredentialRequestOptionsJSON["allowCredentials"]
) {
    let messageContent: string
    if (typeof message === "string") {
        messageContent = message
    } else if ("raw" in message && typeof message.raw === "string") {
        messageContent = message.raw
    } else if ("raw" in message && message.raw instanceof Uint8Array) {
        // convert raw bytes -> hex string (without 0x)
        messageContent = Buffer.from(message.raw).toString("hex")
    } else {
        throw new Error("Unsupported message format")
    }

    // remove any 0x prefix for simpler base64 conversion
    const formattedMessage = messageContent.startsWith("0x")
        ? messageContent.slice(2)
        : messageContent

    // convert hex -> base64
    const challenge = base64FromUint8Array(
        hexStringToUint8Array(formattedMessage),
        true
    )

    // call react-native-passkeys
    const cred = await passkey.get({
        rpId: rpID,
        challenge,
        allowCredentials,
        userVerification: "required"
    })

    if (!cred) {
        throw new Error("No passkey credential found")
    }

    // get authenticator data
    const { authenticatorData } = cred.response
    const authenticatorDataHex = uint8ArrayToHexString(
        b64ToBytes(authenticatorData)
    )

    // parse client data JSON
    const clientDataJSON = atob(cred.response.clientDataJSON)
    const { beforeType } = findQuoteIndices(clientDataJSON)

    // parse signature r/s
    const { signature } = cred.response
    const signatureHex = uint8ArrayToHexString(b64ToBytes(signature))
    const { r, s } = parseAndNormalizeSig(signatureHex)

    // encode signature in the format the Passkey Validator expects
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
