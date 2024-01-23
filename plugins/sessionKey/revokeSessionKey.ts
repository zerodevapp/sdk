import {
    type KernelAccountClient,
    type KernelSmartAccount
} from "@kerneljs/core"
import {
    type Address,
    type Chain,
    type Hex,
    type Transport,
    encodeFunctionData
} from "viem"
import { SESSION_KEY_VALIDATOR_ADDRESS } from "."

const SessionKeyValidatorAbi = [
    {
        inputs: [],
        name: "NotImplemented",
        type: "error"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes"
            }
        ],
        name: "disable",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes"
            }
        ],
        name: "enable",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "permissionKey",
                type: "bytes32"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "executionStatus",
        outputs: [
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "uint48",
                name: "runs",
                type: "uint48"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint128",
                name: "nonce",
                type: "uint128"
            }
        ],
        name: "invalidateNonce",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint128",
                name: "lastNonce",
                type: "uint128"
            },
            {
                internalType: "uint128",
                name: "invalidNonce",
                type: "uint128"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address"
            },
            {
                internalType: "address",
                name: "kernel",
                type: "address"
            }
        ],
        name: "sessionData",
        outputs: [
            {
                internalType: "bytes32",
                name: "merkleRoot",
                type: "bytes32"
            },
            {
                internalType: "ValidAfter",
                name: "validAfter",
                type: "uint48"
            },
            {
                internalType: "ValidUntil",
                name: "validUntil",
                type: "uint48"
            },
            {
                internalType: "address",
                name: "paymaster",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "nonce",
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
                name: "",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes"
            }
        ],
        name: "validCaller",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes"
            }
        ],
        name: "validateSignature",
        outputs: [
            {
                internalType: "ValidationData",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "sender",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes",
                        name: "initCode",
                        type: "bytes"
                    },
                    {
                        internalType: "bytes",
                        name: "callData",
                        type: "bytes"
                    },
                    {
                        internalType: "uint256",
                        name: "callGasLimit",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "verificationGasLimit",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "preVerificationGas",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "maxFeePerGas",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "maxPriorityFeePerGas",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes",
                        name: "paymasterAndData",
                        type: "bytes"
                    },
                    {
                        internalType: "bytes",
                        name: "signature",
                        type: "bytes"
                    }
                ],
                internalType: "struct UserOperation",
                name: "userOp",
                type: "tuple"
            },
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        name: "validateUserOp",
        outputs: [
            {
                internalType: "ValidationData",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "payable",
        type: "function"
    }
]

export const revokeSessionKey = async <
    TChain extends Chain | undefined = Chain | undefined,
    TTransport extends Transport = Transport
>(
    accountClient: KernelAccountClient<
        TTransport,
        TChain,
        KernelSmartAccount<TTransport, TChain>
    >,
    sessionKeyAddress: Address
): Promise<Hex> => {
    return await accountClient.sendUserOperation({
        userOperation: {
            callData: await accountClient.account.encodeCallData({
                to: SESSION_KEY_VALIDATOR_ADDRESS,
                value: 0n,
                data: encodeFunctionData({
                    abi: SessionKeyValidatorAbi,
                    functionName: "disable",
                    args: [sessionKeyAddress]
                })
            })
        }
    })
}
