export const P256ValidatorAbi = [
  {
    type: "function",
    name: "disable",
    inputs: [{ name: "", type: "bytes", internalType: "bytes" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "enable",
    inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "p256PublicKey",
    inputs: [{ name: "kernel", type: "address", internalType: "address" }],
    outputs: [
      { name: "x", type: "uint256", internalType: "uint256" },
      { name: "y", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "validCaller",
    inputs: [
      { name: "_caller", type: "address", internalType: "address" },
      { name: "", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "validateSignature",
    inputs: [
      { name: "hash", type: "bytes32", internalType: "bytes32" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "ValidationData" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "validateUserOp",
    inputs: [
      {
        name: "_userOp",
        type: "tuple",
        internalType: "struct UserOperation",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "nonce", type: "uint256", internalType: "uint256" },
          { name: "initCode", type: "bytes", internalType: "bytes" },
          { name: "callData", type: "bytes", internalType: "bytes" },
          { name: "callGasLimit", type: "uint256", internalType: "uint256" },
          {
            name: "verificationGasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "preVerificationGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "maxFeePerGas", type: "uint256", internalType: "uint256" },
          {
            name: "maxPriorityFeePerGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "paymasterAndData", type: "bytes", internalType: "bytes" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
      { name: "_userOpHash", type: "bytes32", internalType: "bytes32" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "validationData",
        type: "uint256",
        internalType: "ValidationData",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "P256PublicKeysChanged",
    inputs: [
      {
        name: "kernel",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newKeys",
        type: "tuple",
        indexed: false,
        internalType: "struct P256Validator.PublicKey",
        components: [
          { name: "x", type: "uint256", internalType: "uint256" },
          { name: "y", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "BadKey", inputs: [] },
  { type: "error", name: "NotImplemented", inputs: [] },
];