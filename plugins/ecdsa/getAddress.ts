import { KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import {
    type Address,
    type Hex,
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

const getInitCodeHash = async (publicClient: PublicClient): Promise<Hex> => {
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
    return await factoryContract.read.initCodeHash()
}

type GetKernelAddressFromECDSAParams =
    | {
          publicClient: PublicClient
          eoaAddress: Address
          index: bigint
      }
    | {
          eoaAddress: Address
          index: bigint
          initCodeHash: Hex
      }

export async function getKernelAddressFromECDSA(
    params: GetKernelAddressFromECDSAParams
) {
    const bytecodeHash = await (async () => {
        if ("initCodeHash" in params) {
            return params.initCodeHash
        }
        if ("publicClient" in params) {
            return await getInitCodeHash(params.publicClient)
        }
        throw new Error("Either initCodeHash or publicClient must be provided")
    })()
    const encodedIndex = pad(toHex(params.index), { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "initialize",
        args: [ECDSA_VALIDATOR_ADDRESS, params.eoaAddress]
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
