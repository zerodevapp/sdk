export const YiSubAccountAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_dm",
                type: "address",
                internalType: "contract IDelegationManager"
            }
        ],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "dm",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IDelegationManager"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "executeDelegatedAction",
        inputs: [
            {
                name: "_action",
                type: "tuple",
                internalType: "struct Action",
                components: [
                    { name: "to", type: "address", internalType: "address" },
                    { name: "value", type: "uint256", internalType: "uint256" },
                    { name: "data", type: "bytes", internalType: "bytes" }
                ]
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "initialize",
        inputs: [{ name: "_root", type: "address", internalType: "address" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            { name: "hash", type: "bytes32", internalType: "bytes32" },
            { name: "sig", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "view"
    },
    { type: "error", name: "AlreadyInitialized", inputs: [] },
    { type: "error", name: "Forbidden", inputs: [] }
] as const
