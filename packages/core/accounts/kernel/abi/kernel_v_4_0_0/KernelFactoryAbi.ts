export const KernelV4FactoryAbi = [
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
        name: "deploy",
        inputs: [
            {
                name: "initialPackages",
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
                name: "nonce",
                type: "uint256",
                internalType: "uint256"
            }
        ],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract Kernel"
            }
        ],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "deployWithAdditionalPackage",
        inputs: [
            {
                name: "initialPackages",
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
                name: "nonce",
                type: "uint256",
                internalType: "uint256"
            },
            {
                name: "replayable",
                type: "bool",
                internalType: "bool"
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
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract Kernel"
            }
        ],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "template",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract Kernel"
            }
        ],
        stateMutability: "view"
    }
] as const
