export const EIP155 = "eip155" as const

export const KERNEL_COMPATIBLE_METHODS = [
    "eth_accounts",
    "eth_chainId",
    "personal_sign",
    "eth_sign",
    "eth_signTypedData",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
    "eth_blockNumber",
    "eth_getBalance",
    "eth_getCode",
    "eth_getTransactionCount",
    "eth_getStorageAt",
    "eth_getBlockByNumber",
    "eth_getBlockByHash",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_estimateGas",
    "eth_call",
    "eth_getLogs",
    "eth_gasPrice",
    "wallet_getCapabilities",
    "wallet_sendCalls",
    "wallet_getCallStatus",
    "wallet_issuePermissions",
    "wallet_switchEthereumChain",
]

export const KERNEL_COMPATIBLE_EVENTS = ["chainChanged", "accountsChanged"]

export const stripEip155Prefix = (eip155Address: string): string => {
    return eip155Address.split(":").pop() ?? ""
}
