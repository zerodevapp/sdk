/**
 * @warn This abi is temporary and will be replaced by @zerodev/sdk
 */

export const WeightedValidatorAbi = [
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
        name: "guardian",
        inputs: [
            {
                name: "guardianIndex",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "kernel",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "guardianType",
                type: "bytes1",
                internalType: "bytes1"
            },
            {
                name: "weight",
                type: "uint24",
                internalType: "uint24"
            },
            {
                name: "encodedPublicKey",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "isInitialized",
        inputs: [
            {
                name: "smartAccount",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "isModuleType",
        inputs: [
            {
                name: "moduleTypeId",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "isValidSignatureWithSender",
        inputs: [
            { name: "", type: "address", internalType: "address" },
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
        outputs: [{ name: "", type: "bytes4", internalType: "bytes4" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "onInstall",
        inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "onUninstall",
        inputs: [{ name: "", type: "bytes", internalType: "bytes" }],
        outputs: [],
        stateMutability: "payable"
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
            },
            {
                name: "approvals",
                type: "uint24",
                internalType: "uint24"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "renew",
        inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
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
                internalType: "struct PackedUserOperation",
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
                        name: "accountGasLimits",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    {
                        name: "preVerificationGas",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "gasFees",
                        type: "bytes32",
                        internalType: "bytes32"
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
            }
        ],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "payable"
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
                name: "guardianIndex",
                type: "uint256",
                internalType: "uint256"
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
                name: "guardianLength",
                type: "uint32",
                internalType: "uint32"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "GuardianAddedK1",
        inputs: [
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "index",
                type: "uint256",
                indexed: true,
                internalType: "uint256"
            },
            {
                name: "guardian",
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
        name: "GuardianAddedR1",
        inputs: [
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "index",
                type: "uint256",
                indexed: true,
                internalType: "uint256"
            },
            {
                name: "authenticatorIdHash",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32"
            },
            {
                name: "pubKeyX",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            },
            {
                name: "pubKeyY",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
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
        name: "GuardianRemovedK1",
        inputs: [
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "index",
                type: "uint256",
                indexed: true,
                internalType: "uint256"
            },
            {
                name: "guardian",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "GuardianRemovedR1",
        inputs: [
            {
                name: "kernel",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "index",
                type: "uint256",
                indexed: true,
                internalType: "uint256"
            },
            {
                name: "authenticatorIdHash",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32"
            }
        ],
        anonymous: false
    },
    {
        type: "error",
        name: "AlreadyInitialized",
        inputs: [
            {
                name: "smartAccount",
                type: "address",
                internalType: "address"
            }
        ]
    },
    {
        type: "error",
        name: "InvalidSignature",
        inputs: [{ name: "i", type: "uint256", internalType: "uint256" }]
    },
    {
        type: "error",
        name: "InvalidTargetAddress",
        inputs: [
            {
                name: "target",
                type: "address",
                internalType: "address"
            }
        ]
    },
    {
        type: "error",
        name: "NotInitialized",
        inputs: [
            {
                name: "smartAccount",
                type: "address",
                internalType: "address"
            }
        ]
    },
    { type: "error", name: "NotSupportedSignatureType", inputs: [] },
    { type: "error", name: "WrongGuardianDataLength", inputs: [] }
] as const
