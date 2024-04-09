import { KERNEL_ADDRESSES, KernelAccountAbi } from "@zerodev/sdk"
import { getEntryPointVersion } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
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
import { ECDSA_VALIDATOR_ADDRESS_V06 } from "./constants.js"

const getInitCodeHash = async (publicClient: PublicClient): Promise<Hex> => {
    const factoryContract = getContract({
        address: KERNEL_ADDRESSES.FACTORY_ADDRESS_V0_6,
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

type GetKernelAddressFromECDSAParams<entryPoint extends EntryPoint> =
    | {
          entryPointAddress: entryPoint
          publicClient: PublicClient
          eoaAddress: Address
          index: bigint
      }
    | {
          entryPointAddress: entryPoint
          eoaAddress: Address
          index: bigint
          initCodeHash: Hex
      }

export async function getKernelAddressFromECDSA<entryPoint extends EntryPoint>(
    params: GetKernelAddressFromECDSAParams<entryPoint>
) {
    const entryPointVersion = getEntryPointVersion(params.entryPointAddress)
    if (entryPointVersion !== "v0.6") {
        throw Error(
            "Only EntryPoint v0.6 is supported. TODO! Ping us to add support. :)"
        )
    }
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
        args: [ECDSA_VALIDATOR_ADDRESS_V06, params.eoaAddress]
    })
    const encodedSalt = concat([initData, encodedIndex])
    const salt = BigInt(keccak256(encodedSalt))
    const mask = BigInt("0xffffffffffffffffffffffff")
    const maskedSalt = toHex(salt & mask, { size: 32 })

    return getContractAddress({
        bytecodeHash,
        opcode: "CREATE2",
        from: KERNEL_ADDRESSES.FACTORY_ADDRESS_V0_6,
        salt: maskedSalt
    })
}
