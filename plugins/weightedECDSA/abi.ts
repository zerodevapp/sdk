/**
 * @warn This abi is temporary and will be replaced by @zerodev/sdk
 */

export const WeightedValidatorAbi = [
    {
        inputs: [],
        name: "NotImplemented",
        type: "error"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_callDataAndNonceHash",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "_kernel",
                type: "address"
            }
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_callDataAndNonceHash",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "_kernel",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "sigs",
                type: "bytes"
            }
        ],
        name: "approveWithSig",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "",
                type: "bytes"
            }
        ],
        name: "disable",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [],
        name: "eip712Domain",
        outputs: [
            {
                internalType: "bytes1",
                name: "fields",
                type: "bytes1"
            },
            {
                internalType: "string",
                name: "name",
                type: "string"
            },
            {
                internalType: "string",
                name: "version",
                type: "string"
            },
            {
                internalType: "uint256",
                name: "chainId",
                type: "uint256"
            },
            {
                internalType: "address",
                name: "verifyingContract",
                type: "address"
            },
            {
                internalType: "bytes32",
                name: "salt",
                type: "bytes32"
            },
            {
                internalType: "uint256[]",
                name: "extensions",
                type: "uint256[]"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes"
            }
        ],
        name: "enable",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            },
            {
                internalType: "bytes32",
                name: "hash",
                type: "bytes32"
            }
        ],
        name: "getApproval",
        outputs: [
            {
                internalType: "uint256",
                name: "approvals",
                type: "uint256"
            },
            {
                internalType: "bool",
                name: "passed",
                type: "bool"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "guardian",
                type: "address"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "guardian",
        outputs: [
            {
                internalType: "uint24",
                name: "weight",
                type: "uint24"
            },
            {
                internalType: "address",
                name: "nextGuardian",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "callDataAndNonceHash",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "proposalStatus",
        outputs: [
            {
                internalType: "enum ProposalStatus",
                name: "status",
                type: "uint8"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "_guardians",
                type: "address[]"
            },
            {
                internalType: "uint24[]",
                name: "_weights",
                type: "uint24[]"
            },
            {
                internalType: "uint24",
                name: "_threshold",
                type: "uint24"
            },
            {
                internalType: "uint48",
                name: "_delay",
                type: "uint48"
            }
        ],
        name: "renew",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes"
            }
        ],
        name: "validCaller",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes"
            }
        ],
        name: "validateSignature",
        outputs: [
            {
                internalType: "ValidationData",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "sender",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes",
                        name: "initCode",
                        type: "bytes"
                    },
                    {
                        internalType: "bytes",
                        name: "callData",
                        type: "bytes"
                    },
                    {
                        internalType: "uint256",
                        name: "callGasLimit",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "verificationGasLimit",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "preVerificationGas",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "maxFeePerGas",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "maxPriorityFeePerGas",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes",
                        name: "paymasterAndData",
                        type: "bytes"
                    },
                    {
                        internalType: "bytes",
                        name: "signature",
                        type: "bytes"
                    }
                ],
                internalType: "struct UserOperation",
                name: "userOp",
                type: "tuple"
            },
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        name: "validateUserOp",
        outputs: [
            {
                internalType: "ValidationData",
                name: "validationData",
                type: "uint256"
            }
        ],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_callDataAndNonceHash",
                type: "bytes32"
            }
        ],
        name: "veto",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "callDataAndNonceHash",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "guardian",
                type: "address"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "voteStatus",
        outputs: [
            {
                internalType: "enum VoteStatus",
                name: "status",
                type: "uint8"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "weightedStorage",
        outputs: [
            {
                internalType: "uint24",
                name: "totalWeight",
                type: "uint24"
            },
            {
                internalType: "uint24",
                name: "threshold",
                type: "uint24"
            },
            {
                internalType: "uint48",
                name: "delay",
                type: "uint48"
            },
            {
                internalType: "address",
                name: "firstGuardian",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    }
] as const
