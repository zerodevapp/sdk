export const KernelModuleIsInitializedAbi = [
    {
        type: "function",
        name: "isInitialized",
        inputs: [
            { name: "smartAccount", type: "address", internalType: "address" }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    }
] as const

export const KernelModuleInstallAbi = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "moduleType",
                type: "uint256"
            },
            { internalType: "address", name: "module", type: "address" },
            { internalType: "bytes", name: "initData", type: "bytes" }
        ],
        stateMutability: "payable",
        type: "function",
        name: "installModule"
    }
] as const

export const KernelModuleIsModuleInstalledAbi = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "moduleType",
                type: "uint256"
            },
            { internalType: "address", name: "module", type: "address" },
            {
                internalType: "bytes",
                name: "additionalContext",
                type: "bytes"
            }
        ],
        stateMutability: "view",
        type: "function",
        name: "isModuleInstalled",
        outputs: [{ internalType: "bool", name: "", type: "bool" }]
    }
] as const
