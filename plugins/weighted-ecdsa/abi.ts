/**
 * @warn This abi is temporary and will be replaced by @zerodev/sdk
 */

export const WeightedValidatorAbi = [
    {
        type: "function",
        name: "approve",
        inputs: [
            {
                name: "_callDataAndNonceHash",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "_kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "approveWithSig",
        inputs: [
            {
                name: "_callDataAndNonceHash",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "_kernel",
                type: "address",
                internalType: "address"
            },
            { name: "sigs", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "disable",
        inputs: [{ name: "", type: "bytes", internalType: "bytes" }],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "eip712Domain",
        inputs: [],
        outputs: [
            {
                name: "fields",
                type: "bytes1",
                internalType: "bytes1"
            },
            { name: "name", type: "string", internalType: "string" },
            {
                name: "version",
                type: "string",
                internalType: "string"
            },
            {
                name: "chainId",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "verifyingContract",
                type: "address",
                internalType: "address"
            },
            {
                name: "salt",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "extensions",
                type: "uint256[]",
                internalType: "uint256[]"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "enable",
        inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "getApproval",
        inputs: [
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            },
            { name: "hash", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [
            {
                name: "approvals",
                type: "uint256",
                internalType: "uint256"
            },
            { name: "passed", type: "bool", internalType: "bool" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "guardian",
        inputs: [
            {
                name: "guardian",
                type: "address",
                internalType: "address"
            },
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "weight",
                type: "uint24",
                internalType: "uint24"
            },
            {
                name: "nextGuardian",
                type: "address",
                internalType: "address"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "proposalStatus",
        inputs: [
            {
                name: "callDataAndNonceHash",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "status",
                type: "uint8",
                internalType: "enum ProposalStatus"
            },
            {
                name: "validAfter",
                type: "uint48",
                internalType: "ValidAfter"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "renew",
        inputs: [
            {
                name: "_guardians",
                type: "address[]",
                internalType: "address[]"
            },
            {
                name: "_weights",
                type: "uint24[]",
                internalType: "uint24[]"
            },
            {
                name: "_threshold",
                type: "uint24",
                internalType: "uint24"
            },
            { name: "_delay", type: "uint48", internalType: "uint48" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "validCaller",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "validateSignature",
        inputs: [
            {
                name: "hash",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "signature",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "ValidationData"
            }
        ],
        stateMutability: "view"
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
                    {
                        name: "nonce",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "initCode",
                        type: "bytes",
                        internalType: "bytes"
                    },
                    {
                        name: "callData",
                        type: "bytes",
                        internalType: "bytes"
                    },
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
                    {
                        name: "signature",
                        type: "bytes",
                        internalType: "bytes"
                    }
                ]
            },
            {
                name: "userOpHash",
                type: "bytes32",
                internalType: "bytes32"
            },
            { name: "", type: "uint256", internalType: "uint256" }
        ],
        outputs: [
            {
                name: "validationData",
                type: "uint256",
                internalType: "ValidationData"
            }
        ],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "veto",
        inputs: [
            {
                name: "_callDataAndNonceHash",
                type: "bytes32",
                internalType: "bytes32"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "voteStatus",
        inputs: [
            {
                name: "callDataAndNonceHash",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "guardian",
                type: "address",
                internalType: "address"
            },
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "status",
                type: "uint8",
                internalType: "enum VoteStatus"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "weightedStorage",
        inputs: [
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "totalWeight",
                type: "uint24",
                internalType: "uint24"
            },
            {
                name: "threshold",
                type: "uint24",
                internalType: "uint24"
            },
            { name: "delay", type: "uint48", internalType: "uint48" },
            {
                name: "firstGuardian",
                type: "address",
                internalType: "address"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "GuardianAdded",
        inputs: [
            {
                name: "guardian",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "weight",
                type: "uint24",
                indexed: false,
                internalType: "uint24"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "GuardianRemoved",
        inputs: [
            {
                name: "guardian",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    { type: "error", name: "NotImplemented", inputs: [] }
] as const
