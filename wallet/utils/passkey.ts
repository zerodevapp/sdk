export type ZeroDevWalletSigner = {
    isConnected: boolean
    signer: string
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
