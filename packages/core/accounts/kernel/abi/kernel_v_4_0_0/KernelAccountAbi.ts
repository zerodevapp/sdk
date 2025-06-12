export const KernelV4_0AccountAbi = [
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
    {
        type: "fallback",
        stateMutability: "payable"
    },
    {
        type: "receive",
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "accountId",
        inputs: [],
        outputs: [
            {
                name: "accountImplementationId",
                type: "string",
                internalType: "string"
            }
        ],
        stateMutability: "view"
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
            {
                name: "name",
                type: "string",
                internalType: "string"
            },
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
        name: "execute",
        inputs: [
            {
                name: "mode",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "executionData",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "executeFromExecutor",
        inputs: [
            {
                name: "mode",
                type: "bytes32",
                internalType: "bytes32"
            },
            {
                name: "executionData",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "executeUserOp",
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
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "executorConfig",
        inputs: [
            {
                name: "executor",
                type: "address",
                internalType: "address"
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ExecutorManager.ExecutorConfig",
                components: [
                    {
                        name: "hook",
                        type: "address",
                        internalType: "contract IHook"
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "installModule",
        inputs: [
            {
                name: "moduleType",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "module",
                type: "address",
                internalType: "address"
            },
            {
                name: "initData",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "installModule",
        inputs: [
            {
                name: "replayable",
                type: "bool",
                internalType: "bool"
            },
            {
                name: "nonce",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "packages",
                type: "tuple[]",
                internalType: "struct Install[]",
                components: [
                    {
                        name: "moduleType",
                        type: "uint256",
                        internalType: "uint256"
                    },
                    {
                        name: "module",
                        type: "address",
                        internalType: "address"
                    },
                    {
                        name: "moduleData",
                        type: "bytes",
                        internalType: "bytes"
                    },
                    {
                        name: "internalData",
                        type: "bytes",
                        internalType: "bytes"
                    }
                ]
            },
            {
                name: "signature",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "isModuleInstalled",
        inputs: [
            {
                name: "moduleTypeId",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "module",
                type: "address",
                internalType: "address"
            },
            {
                name: "additionalContext",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "isValidSignature",
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
                name: "result",
                type: "bytes4",
                internalType: "bytes4"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "nonce",
        inputs: [
            {
                name: "key",
                type: "uint192",
                internalType: "uint192"
            }
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "proxiableUUID",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "bytes32"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "registry",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "selectorConfig",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4"
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct SelectorManager.SelectorConfig",
                components: [
                    {
                        name: "hook",
                        type: "address",
                        internalType: "contract IHook"
                    },
                    {
                        name: "target",
                        type: "address",
                        internalType: "address"
                    },
                    {
                        name: "callType",
                        type: "bytes1",
                        internalType: "CallType"
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "setNonce",
        inputs: [
            {
                name: "nonceKey",
                type: "uint192",
                internalType: "uint192"
            },
            {
                name: "seq",
                type: "uint64",
                internalType: "uint64"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "setRoot",
        inputs: [
            {
                name: "vId",
                type: "bytes20",
                internalType: "ValidationId"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "setValidNonceFrom",
        inputs: [
            {
                name: "seq",
                type: "uint64",
                internalType: "uint64"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "supportsExecutionMode",
        inputs: [
            {
                name: "mode",
                type: "bytes32",
                internalType: "bytes32"
            }
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "supportsModule",
        inputs: [
            {
                name: "moduleTypeId",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "uninstallModule",
        inputs: [
            {
                name: "moduleType",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "module",
                type: "address",
                internalType: "address"
            },
            {
                name: "initData",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "upgradeToAndCall",
        inputs: [
            {
                name: "newImplementation",
                type: "address",
                internalType: "address"
            },
            {
                name: "data",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "validNonceFrom",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint64",
                internalType: "uint64"
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
            },
            {
                name: "missingAccountFunds",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "validationInfo",
        inputs: [
            {
                name: "vId",
                type: "bytes20",
                internalType: "ValidationId"
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ValidationInfo",
                components: [
                    {
                        name: "vType",
                        type: "bytes1",
                        internalType: "ValidationType"
                    },
                    {
                        name: "policies",
                        type: "address[]",
                        internalType: "address[]"
                    },
                    {
                        name: "signer",
                        type: "address",
                        internalType: "address"
                    }
                ]
            }
        ],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "ModuleInstalled",
        inputs: [
            {
                name: "moduleType",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            },
            {
                name: "module",
                type: "address",
                indexed: false,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ModuleUninstalled",
        inputs: [
            {
                name: "moduleType",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            },
            {
                name: "module",
                type: "address",
                indexed: false,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "Received",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: false,
                internalType: "address"
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "Upgraded",
        inputs: [
            {
                name: "implementation",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "error",
        name: "InstallSignatureVerificationFailed",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidCallType",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidExecType",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidNonce",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidPermissionId",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidPermissionUninstallOrder",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidRootValidation",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidSelector",
        inputs: []
    },
    {
        type: "error",
        name: "InvalidValidator",
        inputs: []
    },
    {
        type: "error",
        name: "ModuleInstallFailed",
        inputs: []
    },
    {
        type: "error",
        name: "NotExecutor",
        inputs: []
    },
    {
        type: "error",
        name: "NotImplemented",
        inputs: []
    },
    {
        type: "error",
        name: "NotInstalled",
        inputs: []
    },
    {
        type: "error",
        name: "OccupiedValidationId",
        inputs: []
    },
    {
        type: "error",
        name: "Unauthorized",
        inputs: []
    },
    {
        type: "error",
        name: "UnauthorizedCallContext",
        inputs: []
    },
    {
        type: "error",
        name: "UpgradeFailed",
        inputs: []
    }
] as const
