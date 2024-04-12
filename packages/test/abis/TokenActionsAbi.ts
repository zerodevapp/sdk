export const TokenActionsAbi = [
    {
        type: "function",
        name: "transferERC1155Action",
        inputs: [
            { name: "_token", type: "address", internalType: "address" },
            { name: "_id", type: "uint256", internalType: "uint256" },
            { name: "_to", type: "address", internalType: "address" },
            { name: "amount", type: "uint256", internalType: "uint256" },
            { name: "data", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "transferERC20Action",
        inputs: [
            { name: "_token", type: "address", internalType: "address" },
            { name: "_amount", type: "uint256", internalType: "uint256" },
            { name: "_to", type: "address", internalType: "address" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "transferERC721Action",
        inputs: [
            { name: "_token", type: "address", internalType: "address" },
            { name: "_id", type: "uint256", internalType: "uint256" },
            { name: "_to", type: "address", internalType: "address" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    }
] as const
