export const KernelAccountV2Abi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_entryPoint",
                type: "address",
                internalType: "contract IEntryPoint"
            }
        ],
        stateMutability: "nonpayable"
    },
    { type: "fallback", stateMutability: "payable" },
    { type: "receive", stateMutability: "payable" },
    {
        type: "function",
        name: "disableMode",
        inputs: [
            { name: "_disableFlag", type: "bytes4", internalType: "bytes4" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "entryPoint",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IEntryPoint"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "execute",
        inputs: [
            { name: "to", type: "address", internalType: "address" },
            { name: "value", type: "uint256", internalType: "uint256" },
            { name: "data", type: "bytes", internalType: "bytes" },
            {
                name: "operation",
                type: "uint8",
                internalType: "enum Operation"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "getDefaultValidator",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IKernelValidator"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getDisabledMode",
        inputs: [],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getExecution",
        inputs: [{ name: "_selector", type: "bytes4", internalType: "bytes4" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ExecutionDetail",
                components: [
                    {
                        name: "validUntil",
                        type: "uint48",
                        internalType: "uint48"
                    },
                    {
                        name: "validAfter",
                        type: "uint48",
                        internalType: "uint48"
                    },
                    {
                        name: "executor",
                        type: "address",
                        internalType: "address"
                    },
                    {
                        name: "validator",
                        type: "address",
                        internalType: "contract IKernelValidator"
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getLastDisabledTime",
        inputs: [],
        outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getNonce",
        inputs: [{ name: "key", type: "uint192", internalType: "uint192" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getNonce",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_defaultValidator",
                type: "address",
                internalType: "contract IKernelValidator"
            },
            { name: "_data", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            { name: "hash", type: "bytes32", internalType: "bytes32" },
            { name: "signature", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [{ name: "", type: "string", internalType: "string" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "onERC1155BatchReceived",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "uint256[]", internalType: "uint256[]" },
            { name: "", type: "uint256[]", internalType: "uint256[]" },
            { name: "", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "onERC1155Received",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" },
            { name: "", type: "uint256", internalType: "uint256" },
            { name: "", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "onERC721Received",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" },
            { name: "", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "setDefaultValidator",
        inputs: [
            {
                name: "_defaultValidator",
                type: "address",
                internalType: "contract IKernelValidator"
            },
            { name: "_data", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "setExecution",
        inputs: [
            { name: "_selector", type: "bytes4", internalType: "bytes4" },
            { name: "_executor", type: "address", internalType: "address" },
            {
                name: "_validator",
                type: "address",
                internalType: "contract IKernelValidator"
            },
            { name: "_validUntil", type: "uint48", internalType: "uint48" },
            { name: "_validAfter", type: "uint48", internalType: "uint48" },
            { name: "_enableData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "upgradeTo",
        inputs: [
            {
                name: "_newImplementation",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "validateUserOp",
        inputs: [
            {
                name: "userOp",
                type: "tuple",
                internalType: "struct UserOperation",
                components: [
                    {
                        name: "sender",
                        type: "address",
                        internalType: "address"
                    },
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    { name: "initCode", type: "bytes", internalType: "bytes" },
                    { name: "callData", type: "bytes", internalType: "bytes" },
                    {
                        name: "callGasLimit",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "verificationGasLimit",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "preVerificationGas",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "maxFeePerGas",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "maxPriorityFeePerGas",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "paymasterAndData",
                        type: "bytes",
                        internalType: "bytes"
                    },
                    { name: "signature", type: "bytes", internalType: "bytes" }
                ]
            },
            { name: "userOpHash", type: "bytes32", internalType: "bytes32" },
            {
                name: "missingAccountFunds",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        outputs: [
            {
                name: "validationData",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "version",
        inputs: [],
        outputs: [{ name: "", type: "string", internalType: "string" }],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "DefaultValidatorChanged",
        inputs: [
            {
                name: "oldValidator",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "newValidator",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ExecutionChanged",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4"
            },
            {
                name: "executor",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "validator",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "Upgraded",
        inputs: [
            {
                name: "newImplementation",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    }
] as const
