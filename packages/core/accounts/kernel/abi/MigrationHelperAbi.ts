export const MigrationHelperAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "v1",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "v2",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "v3",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "v4",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "v5",
                type: "address",
                internalType: "contract IValidator"
            },
            { name: "s1", type: "address", internalType: "contract ISigner" },
            { name: "s2", type: "address", internalType: "contract ISigner" },
            { name: "s3", type: "address", internalType: "contract ISigner" },
            {
                name: "tv1",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "tv2",
                type: "address",
                internalType: "contract IValidator"
            },
            {
                name: "tv3",
                type: "address",
                internalType: "contract IValidator"
            },
            { name: "ts1", type: "address", internalType: "contract ISigner" }
        ],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "consumeGas",
        inputs: [{ name: "count", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "isMigrated",
        inputs: [
            {
                name: "kernel",
                type: "address",
                internalType: "contract Kernel"
            },
            {
                name: "validators",
                type: "address[]",
                internalType: "contract IValidator[]"
            },
            { name: "pIds", type: "bytes4[]", internalType: "PermissionId[]" }
        ],
        outputs: [
            { name: "root", type: "bool", internalType: "bool" },
            { name: "v", type: "bool[]", internalType: "bool[]" },
            { name: "p", type: "bool[]", internalType: "bool[]" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "migrate",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "migrateWithCall",
        inputs: [
            {
                name: "validators",
                type: "address[]",
                internalType: "contract IValidator[]"
            },
            {
                name: "permissionIds",
                type: "bytes4[]",
                internalType: "bytes4[]"
            },
            { name: "execMode", type: "bytes32", internalType: "ExecMode" },
            { name: "execData", type: "bytes", internalType: "bytes" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "migrateWithPermissionId",
        inputs: [
            {
                name: "permissionId",
                type: "bytes4[]",
                internalType: "bytes4[]"
            },
            {
                name: "validators",
                type: "address[]",
                internalType: "contract IValidator[]"
            }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "mockSlot",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" }
        ],
        outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "usedSlot",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    }
] as const
