export const KernelFactoryV2Abi = [
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
        type: "function",
        name: "createAccount",
        inputs: [
            {
                name: "_validator",
                type: "address",
                internalType: "contract IKernelValidator"
            },
            { name: "_data", type: "bytes", internalType: "bytes" },
            { name: "_index", type: "uint256", internalType: "uint256" }
        ],
        outputs: [
            {
                name: "proxy",
                type: "address",
                internalType: "contract EIP1967Proxy"
            }
        ],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "entryPoint",
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
        name: "getAccountAddress",
        inputs: [
            {
                name: "_validator",
                type: "address",
                internalType: "contract IKernelValidator"
            },
            { name: "_data", type: "bytes", internalType: "bytes" },
            { name: "_index", type: "uint256", internalType: "uint256" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "kernelTemplate",
        inputs: [],
        outputs: [
            { name: "", type: "address", internalType: "contract TempKernel" }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "nextTemplate",
        inputs: [],
        outputs: [
            { name: "", type: "address", internalType: "contract Kernel" }
        ],
        stateMutability: "view"
    },
    {
        type: "event",
        name: "AccountCreated",
        inputs: [
            {
                name: "account",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "validator",
                type: "address",
                indexed: true,
                internalType: "address"
            },
            {
                name: "data",
                type: "bytes",
                indexed: false,
                internalType: "bytes"
            },
            {
                name: "index",
                type: "uint256",
                indexed: false,
                internalType: "uint256"
            }
        ],
        anonymous: false
    }
] as const
