export const YiSubAccountFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_dm",
                type: "address",
                internalType: "contract IDelegationManager"
            }
        ],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "createAccount",
        inputs: [
            { name: "data", type: "bytes", internalType: "bytes" },
            { name: "salt", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "createAccountWithParent",
        inputs: [
            { name: "data", type: "bytes", internalType: "bytes" },
            { name: "salt", type: "bytes32", internalType: "bytes32" },
            { name: "parentInitCode", type: "bytes", internalType: "bytes" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
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
        name: "getAddress",
        inputs: [
            { name: "data", type: "bytes", internalType: "bytes" },
            { name: "salt", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "implementation",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract YiSubAccount"
            }
        ],
        stateMutability: "view"
    },
    { type: "error", name: "InitializeError", inputs: [] }
] as const
