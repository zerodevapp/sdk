export const KernelFactoryStakerAbi = [
    {
        type: "constructor",
        inputs: [{ name: "_owner", type: "address", internalType: "address" }],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "approveFactory",
        inputs: [
            {
                name: "factory",
                type: "address",
                internalType: "contract KernelFactory"
            },
            { name: "approval", type: "bool", internalType: "bool" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "approved",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "contract KernelFactory"
            }
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "cancelOwnershipHandover",
        inputs: [],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "completeOwnershipHandover",
        inputs: [
            { name: "pendingOwner", type: "address", internalType: "address" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "deployWithFactory",
        inputs: [
            {
                name: "factory",
                type: "address",
                internalType: "contract KernelFactory"
            },
            { name: "createData", type: "bytes", internalType: "bytes" },
            { name: "salt", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [{ name: "result", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "ownershipHandoverExpiresAt",
        inputs: [
            { name: "pendingOwner", type: "address", internalType: "address" }
        ],
        outputs: [{ name: "result", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "renounceOwnership",
        inputs: [],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "requestOwnershipHandover",
        inputs: [],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "stake",
        inputs: [
            {
                name: "entryPoint",
                type: "address",
                internalType: "contract IEntryPoint"
            },
            { name: "unstakeDelay", type: "uint32", internalType: "uint32" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "transferOwnership",
        inputs: [
            { name: "newOwner", type: "address", internalType: "address" }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "unlockStake",
        inputs: [
            {
                name: "entryPoint",
                type: "address",
                internalType: "contract IEntryPoint"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "withdrawStake",
        inputs: [
            {
                name: "entryPoint",
                type: "address",
                internalType: "contract IEntryPoint"
            },
            {
                name: "recipient",
                type: "address",
                internalType: "address payable"
            }
        ],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "event",
        name: "OwnershipHandoverCanceled",
        inputs: [
            {
                name: "pendingOwner",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "OwnershipHandoverRequested",
        inputs: [
            {
                name: "pendingOwner",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "OwnershipTransferred",
        inputs: [
            {
                name: "oldOwner",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "newOwner",
                type: "address",
                indexed: true,
                internalType: "address"
            }
        ],
        anonymous: false
    },
    { type: "error", name: "AlreadyInitialized", inputs: [] },
    { type: "error", name: "NewOwnerIsZeroAddress", inputs: [] },
    { type: "error", name: "NoHandoverRequest", inputs: [] },
    { type: "error", name: "NotApprovedFactory", inputs: [] },
    { type: "error", name: "Unauthorized", inputs: [] }
] as const
