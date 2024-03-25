import { KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import {
    type Address,
    type PublicClient,
    concat,
    encodeFunctionData,
    getContract,
    getContractAddress,
    keccak256,
    pad,
    toHex
} from "viem"
import { ECDSA_VALIDATOR_ADDRESS } from "./constants.js"

export async function getKernelAddressFromECDSA(
    publicClient: PublicClient,
    eoaAddress: Address,
    index: bigint
) {
    const factoryContract = getContract({
        address: KERNEL_ADDRESSES.FACTORY_ADDRESS,
        abi: [
            {
                type: "function",
                name: "initCodeHash",
                inputs: [],
                outputs: [
                    { name: "result", type: "bytes32", internalType: "bytes32" }
                ],
                stateMutability: "view"
            }
        ],
        client: publicClient
    })

    const bytecodeHash = await factoryContract.read.initCodeHash()
    const encodedIndex = pad(toHex(index), { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "initialize",
        args: [ECDSA_VALIDATOR_ADDRESS, eoaAddress]
    })
    const encodedSalt = concat([initData, encodedIndex])
    const salt = BigInt(keccak256(encodedSalt))
    const mask = BigInt("0xffffffffffffffffffffffff")
    const maskedSalt = toHex(salt & mask, { size: 32 })

    return getContractAddress({
        bytecodeHash,
        opcode: "CREATE2",
        from: KERNEL_ADDRESSES.FACTORY_ADDRESS,
        salt: maskedSalt
    })
}
