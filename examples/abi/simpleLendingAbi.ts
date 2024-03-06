export const simpleLendingAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "lender",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256"
            }
        ],
        name: "borrow",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "deposit",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [],
        name: "getAddress",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "user",
                type: "address"
            }
        ],
        name: "getBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "borrower",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256"
            }
        ],
        name: "getLoanDetails",
        outputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "borrower",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "amount",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "interestRate",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "start",
                        type: "uint256"
                    }
                ],
                internalType: "struct ISimpleLending.Loan",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "borrower",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "interestRate",
                type: "uint256"
            }
        ],
        name: "offerLoan",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "lender",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256"
            }
        ],
        name: "repayLoan",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
]
