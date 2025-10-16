export const KernelV4FactoryAbi = [
    {
        type: "function",
        name: "IMMUTABLE_ECDSA",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract KernelImmutableECDSA"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "UUPS",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract KernelUUPS"
            }
        ],
        stateMutability: "view"
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
        name: "deployECDSA",
        inputs: [
            {
                name: "signer",
                type: "address",
                internalType: "address"
            },
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
        name: "deployECDSAWithCall",
        inputs: [
            {
                name: "signer",
                type: "address",
                internalType: "address"
            },
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
                name: "extraCall",
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
        name: "deployWithCall",
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
                name: "extraCall",
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
        name: "getAddress",
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
                internalType: "address"
            }
        ],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "getECDSAAddress",
        inputs: [
            {
                name: "signer",
                type: "address",
                internalType: "address"
            },
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
                internalType: "address"
            }
        ],
        stateMutability: "view"
    }
] as const
