import {
    WEBAUTHN_VALIDATOR_ADDRESS_V06,
    WEBAUTHN_VALIDATOR_ADDRESS_V07
} from "@zerodev/passkey-validator"
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless"
import type { EntryPoint } from "permissionless/types"

export type ZeroDevWalletSigner = {
    isConnected: boolean
    signer: string
}

export const getWebauthnValidatorAddress = (entryPoint: EntryPoint) => {
    if (entryPoint === ENTRYPOINT_ADDRESS_V06) {
        return WEBAUTHN_VALIDATOR_ADDRESS_V06
    }
    return WEBAUTHN_VALIDATOR_ADDRESS_V07
}

export const getZerodevSigner = (): ZeroDevWalletSigner | null => {
    if (typeof window === "undefined") return null
    const signer = window.localStorage.getItem("zerodev_wallet_signer")
    if (!signer) return null

    try {
        const parsedSigner = JSON.parse(signer)
        if (
            parsedSigner &&
            typeof parsedSigner === "object" &&
            "isConnected" in parsedSigner &&
            "signer" in parsedSigner
        ) {
            return parsedSigner as ZeroDevWalletSigner
        }
        return null
    } catch (err) {
        return null
    }
}

export const setZerodevSigner = (signer: string, isConnected: boolean) => {
    if (typeof window === "undefined") return

    window.localStorage.setItem(
        "zerodev_wallet_signer",
        JSON.stringify({ signer, isConnected })
    )
    return
}
