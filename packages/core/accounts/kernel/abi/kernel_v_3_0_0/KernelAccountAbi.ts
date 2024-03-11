export const KernelV3InitAbi = [
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_rootValidator",
                type: "bytes21",
                internalType: "ValidationId"
            },
            { name: "hook", type: "address", internalType: "contract IHook" },
            { name: "validatorData", type: "bytes", internalType: "bytes" },
            { name: "hookData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    }
] as const

export const KernelV3ExecuteAbi = [
    {
        type: "function",
        name: "execute",
        inputs: [
            { name: "execMode", type: "bytes32", internalType: "ExecMode" },
            {
                name: "executionCalldata",
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
            { name: "execMode", type: "bytes32", internalType: "ExecMode" },
            {
                name: "executionCalldata",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [
            { name: "returnData", type: "bytes[]", internalType: "bytes[]" }
        ],
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
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    { name: "initCode", type: "bytes", internalType: "bytes" },
                    { name: "callData", type: "bytes", internalType: "bytes" },
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
                    { name: "signature", type: "bytes", internalType: "bytes" }
                ]
            },
            { name: "userOpHash", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [],
        stateMutability: "payable"
    }
] as const

export const KernelV3AccountAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_entrypoint",
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
        name: "accountId",
        inputs: [],
        outputs: [
            {
                name: "accountImplementationId",
                type: "string",
                internalType: "string"
            }
        ],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "currentNonce",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "eip712Domain",
        inputs: [],
        outputs: [
            { name: "fields", type: "bytes1", internalType: "bytes1" },
            { name: "name", type: "string", internalType: "string" },
            { name: "version", type: "string", internalType: "string" },
            { name: "chainId", type: "uint256", internalType: "uint256" },
            {
                name: "verifyingContract",
                type: "address",
                internalType: "address"
            },
            { name: "salt", type: "bytes32", internalType: "bytes32" },
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
        name: "entrypoint",
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
            { name: "execMode", type: "bytes32", internalType: "ExecMode" },
            {
                name: "executionCalldata",
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
            { name: "execMode", type: "bytes32", internalType: "ExecMode" },
            {
                name: "executionCalldata",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [
            { name: "returnData", type: "bytes[]", internalType: "bytes[]" }
        ],
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
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    { name: "initCode", type: "bytes", internalType: "bytes" },
                    { name: "callData", type: "bytes", internalType: "bytes" },
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
                    { name: "signature", type: "bytes", internalType: "bytes" }
                ]
            },
            { name: "userOpHash", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "executionHook",
        inputs: [
            { name: "userOpHash", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [
            { name: "", type: "address", internalType: "contract IHook" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "executorConfig",
        inputs: [
            {
                name: "executor",
                type: "address",
                internalType: "contract IExecutor"
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ExecutorManager.ExecutorConfig",
                components: [
                    { name: "group", type: "bytes4", internalType: "bytes4" },
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
        name: "initialize",
        inputs: [
            {
                name: "_rootValidator",
                type: "bytes21",
                internalType: "ValidationId"
            },
            { name: "hook", type: "address", internalType: "contract IHook" },
            { name: "validatorData", type: "bytes", internalType: "bytes" },
            { name: "hookData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "installModule",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            { name: "initData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "isModuleInstalled",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            {
                name: "additionalContext",
                type: "bytes",
                internalType: "bytes"
            }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
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
        name: "permissionData",
        inputs: [
            {
                name: "validator",
                type: "bytes21",
                internalType: "ValidationId"
            }
        ],
        outputs: [
            { name: "", type: "bytes22[]", internalType: "PermissionData[]" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "rootValidator",
        inputs: [],
        outputs: [{ name: "", type: "bytes21", internalType: "ValidationId" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "supportsAccountMode",
        inputs: [
            { name: "encodedMode", type: "bytes32", internalType: "ExecMode" }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "supportsModule",
        inputs: [
            { name: "moduleTypeId", type: "uint256", internalType: "uint256" }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "uninstallModule",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            { name: "deInitData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "validNonceFrom",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
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
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    { name: "initCode", type: "bytes", internalType: "bytes" },
                    { name: "callData", type: "bytes", internalType: "bytes" },
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
                internalType: "ValidationData"
            }
        ],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "validatorConfig",
        inputs: [
            {
                name: "validator",
                type: "bytes21",
                internalType: "ValidationId"
            }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ValidationManager.ValidationConfig",
                components: [
                    { name: "group", type: "bytes4", internalType: "bytes4" },
                    { name: "nonce", type: "uint32", internalType: "uint32" },
                    {
                        name: "validFrom",
                        type: "uint48",
                        internalType: "uint48"
                    },
                    {
                        name: "validUntil",
                        type: "uint48",
                        internalType: "uint48"
                    },
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
        type: "event",
        name: "ModuleInstalled",
        inputs: [
            {
                name: "moduleTypeId",
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
                name: "moduleTypeId",
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
        name: "NonceInvalidated",
        inputs: [
            {
                name: "nonce",
                type: "uint32",
                indexed: false,
                internalType: "uint32"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "PermissionInstalled",
        inputs: [
            {
                name: "permission",
                type: "bytes4",
                indexed: false,
                internalType: "PermissionId"
            },
            {
                name: "group",
                type: "bytes4",
                indexed: false,
                internalType: "Group"
            },
            {
                name: "nonce",
                type: "uint32",
                indexed: false,
                internalType: "uint32"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "PermissionUninstalled",
        inputs: [
            {
                name: "permission",
                type: "bytes4",
                indexed: false,
                internalType: "PermissionId"
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
        name: "TryExecuteUnsuccessful",
        inputs: [
            {
                name: "batchExecutionindex",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            },
            {
                name: "result",
                type: "bytes",
                indexed: false,
                internalType: "bytes"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ValidatorInstalled",
        inputs: [
            {
                name: "validator",
                type: "address",
                indexed: false,
                internalType: "contract IValidator"
            },
            {
                name: "group",
                type: "bytes4",
                indexed: false,
                internalType: "Group"
            },
            {
                name: "nonce",
                type: "uint32",
                indexed: false,
                internalType: "uint32"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ValidatorUninstalled",
        inputs: [
            {
                name: "validator",
                type: "address",
                indexed: false,
                internalType: "contract IValidator"
            }
        ],
        anonymous: false
    },
    { type: "error", name: "ExecutionReverted", inputs: [] },
    { type: "error", name: "InvalidCallType", inputs: [] },
    { type: "error", name: "InvalidExecutor", inputs: [] },
    { type: "error", name: "InvalidFallback", inputs: [] },
    { type: "error", name: "InvalidMode", inputs: [] },
    { type: "error", name: "InvalidModuleType", inputs: [] },
    { type: "error", name: "InvalidNonce", inputs: [] },
    { type: "error", name: "InvalidSignature", inputs: [] },
    { type: "error", name: "InvalidValidationType", inputs: [] },
    { type: "error", name: "InvalidValidator", inputs: [] },
    { type: "error", name: "OnlyExecuteUserOp", inputs: [] },
    { type: "error", name: "PermissionDataTooLarge", inputs: [] }
] as const
