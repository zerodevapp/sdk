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
