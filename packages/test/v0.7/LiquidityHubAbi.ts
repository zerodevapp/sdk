export const LiquidityHubAbi = [
    {
        type: "function",
        name: "fill",
        inputs: [
            { name: "orderId", type: "bytes32", internalType: "bytes32" },
            { name: "originData", type: "bytes", internalType: "bytes" },
            { name: "fillerData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "open",
        inputs: [
            {
                name: "order",
                type: "tuple",
                internalType: "struct OnchainCrossChainOrder",
                components: [
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderDataType",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    { name: "orderData", type: "bytes", internalType: "bytes" }
                ]
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "openFor",
        inputs: [
            {
                name: "order",
                type: "tuple",
                internalType: "struct GaslessCrossChainOrder",
                components: [
                    {
                        name: "originSettler",
                        type: "address",
                        internalType: "address"
                    },
                    { name: "user", type: "address", internalType: "address" },
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    {
                        name: "originChainId",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "openDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderDataType",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    { name: "orderData", type: "bytes", internalType: "bytes" }
                ]
            },
            { name: "signature", type: "bytes", internalType: "bytes" },
            { name: "originFillerData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "resolve",
        inputs: [
            {
                name: "order",
                type: "tuple",
                internalType: "struct OnchainCrossChainOrder",
                components: [
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderDataType",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    { name: "orderData", type: "bytes", internalType: "bytes" }
                ]
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ResolvedCrossChainOrder",
                components: [
                    { name: "user", type: "address", internalType: "address" },
                    {
                        name: "originChainId",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "openDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderId",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    {
                        name: "maxSpent",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "minReceived",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "fillInstructions",
                        type: "tuple[]",
                        internalType: "struct FillInstruction[]",
                        components: [
                            {
                                name: "destinationChainId",
                                type: "uint64",
                                internalType: "uint64"
                            },
                            {
                                name: "destinationSettler",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "originData",
                                type: "bytes",
                                internalType: "bytes"
                            }
                        ]
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "resolveFor",
        inputs: [
            {
                name: "order",
                type: "tuple",
                internalType: "struct GaslessCrossChainOrder",
                components: [
                    {
                        name: "originSettler",
                        type: "address",
                        internalType: "address"
                    },
                    { name: "user", type: "address", internalType: "address" },
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    {
                        name: "originChainId",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "openDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderDataType",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    { name: "orderData", type: "bytes", internalType: "bytes" }
                ]
            },
            { name: "originFillerData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ResolvedCrossChainOrder",
                components: [
                    { name: "user", type: "address", internalType: "address" },
                    {
                        name: "originChainId",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "openDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderId",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    {
                        name: "maxSpent",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "minReceived",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "fillInstructions",
                        type: "tuple[]",
                        internalType: "struct FillInstruction[]",
                        components: [
                            {
                                name: "destinationChainId",
                                type: "uint64",
                                internalType: "uint64"
                            },
                            {
                                name: "destinationSettler",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "originData",
                                type: "bytes",
                                internalType: "bytes"
                            }
                        ]
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "Open",
        inputs: [
            {
                name: "orderId",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32"
            },
            {
                name: "resolvedOrder",
                type: "tuple",
                indexed: false,
                internalType: "struct ResolvedCrossChainOrder",
                components: [
                    { name: "user", type: "address", internalType: "address" },
                    {
                        name: "originChainId",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "openDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "fillDeadline",
                        type: "uint32",
                        internalType: "uint32"
                    },
                    {
                        name: "orderId",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    {
                        name: "maxSpent",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "minReceived",
                        type: "tuple[]",
                        internalType: "struct Output[]",
                        components: [
                            {
                                name: "token",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "amount",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "recipient",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "chainId",
                                type: "uint256",
                                internalType: "uint256"
                            }
                        ]
                    },
                    {
                        name: "fillInstructions",
                        type: "tuple[]",
                        internalType: "struct FillInstruction[]",
                        components: [
                            {
                                name: "destinationChainId",
                                type: "uint64",
                                internalType: "uint64"
                            },
                            {
                                name: "destinationSettler",
                                type: "bytes32",
                                internalType: "bytes32"
                            },
                            {
                                name: "originData",
                                type: "bytes",
                                internalType: "bytes"
                            }
                        ]
                    }
                ]
            }
        ],
        anonymous: false
    },
    { type: "error", name: "CallFailed", inputs: [] },
    { type: "error", name: "InvalidAdapter", inputs: [] },
    { type: "error", name: "InvalidOrder", inputs: [] },
    { type: "error", name: "WrongChainId", inputs: [] },
    { type: "error", name: "WrongSettlementContract", inputs: [] }
] as const
