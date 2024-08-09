export const YiDelegationManagerAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        name: "actionNonce",
        inputs: [
            { name: "delegator", type: "address", internalType: "address" },
            { name: "nonceKey", type: "uint192", internalType: "uint192" }
        ],
        outputs: [{ name: "", type: "uint64", internalType: "uint64" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "changeParent",
        inputs: [{ name: "_parent", type: "address", internalType: "address" }],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "deployer",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract SenderCreator"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "onInstall",
        inputs: [{ name: "data", type: "bytes", internalType: "bytes" }],
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
        name: "parent",
        inputs: [{ name: "child", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "parseData",
        inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
        outputs: [
            { name: "initData", type: "bytes", internalType: "bytes" },
            { name: "enableData", type: "bytes", internalType: "bytes" },
            { name: "enableSig", type: "bytes", internalType: "bytes" },
            { name: "actionSig", type: "bytes", internalType: "bytes" }
        ],
        stateMutability: "pure"
    },
    {
        type: "function",
        name: "permissionConfig",
        inputs: [
            { name: "delegator", type: "address", internalType: "address" },
            { name: "permissionId", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [{ name: "hook", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "permissionRevokedNonce",
        inputs: [
            { name: "delegator", type: "address", internalType: "address" }
        ],
        outputs: [{ name: "", type: "uint64", internalType: "uint64" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "redeemDelegation",
        inputs: [
            { name: "_data", type: "bytes", internalType: "bytes" },
            {
                name: "_action",
                type: "tuple",
                internalType: "struct Action",
                components: [
                    { name: "to", type: "address", internalType: "address" },
                    { name: "value", type: "uint256", internalType: "uint256" },
                    { name: "data", type: "bytes", internalType: "bytes" }
                ]
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "event",
        name: "AllowanceUpdated",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "spender",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "token",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "allowance",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ParentRegistered",
        inputs: [
            {
                name: "child",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "parent",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "ParentRemoved",
        inputs: [
            {
                name: "child",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    { type: "error", name: "NotDeployed", inputs: [] },
    { type: "error", name: "NotImplemented", inputs: [] },
    { type: "error", name: "NotParent", inputs: [] }
] as const
