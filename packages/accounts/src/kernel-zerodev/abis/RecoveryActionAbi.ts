export const RecoveryActionAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_validator",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "doRecovery",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
