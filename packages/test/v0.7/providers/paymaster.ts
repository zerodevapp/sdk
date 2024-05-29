export const getZeroDevPaymasterRpc = (): string => {
    const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID_SEPOLIA
    const zeroDevPaymasterRpcHost = process.env.ZERODEV_7677_PAYMASTER_RPC_URL
    if (!zeroDevProjectId || !zeroDevPaymasterRpcHost) {
        throw new Error(
            "ZERODEV_PROJECT_ID and ZERODEV_PAYMASTER_RPC_HOST environment variables must be set"
        )
    }

    return `${zeroDevPaymasterRpcHost}/${zeroDevProjectId}`
}
