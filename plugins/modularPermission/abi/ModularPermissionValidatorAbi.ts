export const ModularPermissionValidatorAbi = [
    {
        inputs: [],
        name: "NotImplemented",
        type: "error"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "kernel",
                type: "address"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "nonce",
                type: "uint256"
            }
        ],
        name: "NonceRevoked",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "kernel",
                type: "address"
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "permissionId",
                type: "bytes32"
            }
        ],
        name: "PermissionRegistered",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "kernel",
                type: "address"
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "permissionId",
                type: "bytes32"
            }
        ],
        name: "PermissionRevoked",
        type: "event"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "data",
                type: "bytes"
            }
        ],
        name: "disable",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "data",
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
                internalType: "bytes12",
                name: "flag",
                type: "bytes12"
            },
            {
                internalType: "contract ISigner",
                name: "signer",
                type: "address"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "ValidUntil",
                name: "validUntil",
                type: "uint48"
            },
            {
                internalType: "PolicyConfig[]",
                name: "_policyConfig",
                type: "bytes32[]"
            },
            {
                internalType: "bytes",
                name: "signerData",
                type: "bytes"
            },
            {
                internalType: "bytes[]",
                name: "policyData",
                type: "bytes[]"
            }
        ],
        name: "getPermissionId",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "permissionId",
                type: "bytes32"
            },
            {
                internalType: "PolicyConfig",
                name: "policy",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "nextPolicy",
        outputs: [
            {
                internalType: "PolicyConfig",
                name: "",
                type: "bytes32"
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
        name: "nonces",
        outputs: [
            {
                internalType: "uint128",
                name: "lastNonce",
                type: "uint128"
            },
            {
                internalType: "uint128",
                name: "revoked",
                type: "uint128"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "data",
                type: "bytes"
            }
        ],
        name: "parseData",
        outputs: [
            {
                internalType: "uint128",
                name: "nonce",
                type: "uint128"
            },
            {
                internalType: "bytes12",
                name: "flag",
                type: "bytes12"
            },
            {
                internalType: "contract ISigner",
                name: "signer",
                type: "address"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "ValidUntil",
                name: "validUntil",
                type: "uint48"
            },
            {
                internalType: "PolicyConfig[]",
                name: "policies",
                type: "bytes32[]"
            },
            {
                internalType: "bytes",
                name: "signerData",
                type: "bytes"
            },
            {
                internalType: "bytes[]",
                name: "policyData",
                type: "bytes[]"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "permissionId",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "permissions",
        outputs: [
            {
                internalType: "uint128",
                name: "nonce",
                type: "uint128"
            },
            {
                internalType: "bytes12",
                name: "flag",
                type: "bytes12"
            },
            {
                internalType: "contract ISigner",
                name: "signer",
                type: "address"
            },
            {
                internalType: "PolicyConfig",
                name: "firstPolicy",
                type: "bytes32"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "ValidUntil",
                name: "validUntil",
                type: "uint48"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        name: "priorityPermission",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint128",
                name: "nonce",
                type: "uint128"
            },
            {
                internalType: "bytes12",
                name: "flag",
                type: "bytes12"
            },
            {
                internalType: "contract ISigner",
                name: "signer",
                type: "address"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "ValidUntil",
                name: "validUntil",
                type: "uint48"
            },
            {
                internalType: "PolicyConfig[]",
                name: "policy",
                type: "bytes32[]"
            },
            {
                internalType: "bytes",
                name: "signerData",
                type: "bytes"
            },
            {
                internalType: "bytes[]",
                name: "policyData",
                type: "bytes[]"
            }
        ],
        name: "registerPermission",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "permissionId",
                type: "bytes32"
            }
        ],
        name: "revokePermission",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint128",
                name: "nonce",
                type: "uint128"
            }
        ],
        name: "revokePermission",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "caller",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "data",
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
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "hash",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes"
            }
        ],
        name: "validateSignature",
        outputs: [
            {
                internalType: "ValidationData",
                name: "validationData",
                type: "uint256"
            }
        ],
        stateMutability: "view",
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
                name: "_userOp",
                type: "tuple"
            },
            {
                internalType: "bytes32",
                name: "_userOpHash",
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
    }
] as const
