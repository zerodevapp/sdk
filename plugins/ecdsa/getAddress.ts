import {
    constants,
    KERNEL_ADDRESSES,
    KernelAccountAbi,
    KernelV3InitAbi
} from "@zerodev/sdk"
import { getEntryPointVersion } from "permissionless"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Hex,
    type PublicClient,
    concat,
    concatHex,
    encodeFunctionData,
    getContract,
    getContractAddress,
    isAddress,
    keccak256,
    toHex,
    zeroAddress
} from "viem"
import {
    ECDSA_VALIDATOR_ADDRESS_V06,
    ECDSA_VALIDATOR_ADDRESS_V07
} from "./constants.js"

const getInitCodeHash = async <entryPoint extends EntryPoint>(
    publicClient: PublicClient,
    entryPointAddress: entryPoint
): Promise<Hex> => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    if (entryPointVersion === "v0.6") {
        return await initCodeHashV0_6(publicClient)
    }
    return initCodeHashV0_7(KERNEL_ADDRESSES.ACCOUNT_LOGIC_V0_7)
}
const initCodeHashV0_6 = async (publicClient: PublicClient) => {
    const factoryContract = getContract({
        address: KERNEL_ADDRESSES.FACTORY_ADDRESS_V0_6,
        abi: [
            {
                type: "function",
                name: "initCodeHash",
                inputs: [],
                outputs: [
                    {
                        name: "result",
                        type: "bytes32",
                        internalType: "bytes32"
                    }
                ],
                stateMutability: "view"
            }
        ],
        client: publicClient
    })
    return await factoryContract.read.initCodeHash()
}
const initCodeHashV0_7 = (implementationAddress: Address) => {
    if (!isAddress(implementationAddress)) {
        throw new Error("Invalid implementation address")
    }

    const initCode = concatHex([
        "0x603d3d8160223d3973",
        implementationAddress,
        "0x6009",
        "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076",
        "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3"
    ])

    const hash = keccak256(initCode)

    return hash
}

const generateSaltForV06 = (eoaAddress: Address, index: bigint) => {
    const encodedIndex = toHex(index, { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "initialize",
        args: [ECDSA_VALIDATOR_ADDRESS_V06, eoaAddress]
    })
    const encodedSalt = concat([initData, encodedIndex])
    const salt = BigInt(keccak256(encodedSalt))
    const mask = BigInt("0xffffffffffffffffffffffff")
    const maskedSalt = toHex(salt & mask, { size: 32 })

    return maskedSalt
}

const generateSaltForV07 = (
    eoaAddress: Address,
    index: bigint,
    hookAddress: Address,
    hookData: Hex
) => {
    const encodedIndex = toHex(index, { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelV3InitAbi,
        functionName: "initialize",
        args: [
            concatHex([
                constants.VALIDATOR_TYPE.SECONDARY,
                ECDSA_VALIDATOR_ADDRESS_V07
            ]),
            hookAddress,
            eoaAddress,
            hookData
        ]
    })
    const packedData = concatHex([initData, encodedIndex])
    return keccak256(packedData)
}

export type GetKernelAddressFromECDSAParams<entryPoint extends EntryPoint> = {
    entryPointAddress: entryPoint
    eoaAddress: Address
    index: bigint
    hookAddress?: entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? never
        : Address
    hookData?: entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE ? never : Hex
} & (
    | { publicClient: PublicClient; initCodeHash?: never }
    | { publicClient?: never; initCodeHash: Hex }
)

export async function getKernelAddressFromECDSA<entryPoint extends EntryPoint>(
    params: GetKernelAddressFromECDSAParams<entryPoint>
) {
    const entryPointVersion = getEntryPointVersion(params.entryPointAddress)
    const bytecodeHash = await (async () => {
        if ("initCodeHash" in params && params.initCodeHash) {
            return params.initCodeHash
        }
        if ("publicClient" in params && params.publicClient) {
            return await getInitCodeHash(
                params.publicClient,
                params.entryPointAddress
            )
        }
        throw new Error("Either initCodeHash or publicClient must be provided")
    })()
    let salt: Hex
    if (entryPointVersion === "v0.6") {
        salt = generateSaltForV06(params.eoaAddress, params.index)
    } else {
        const hookAddress =
            "hookAddress" in params && params.hookAddress
                ? params.hookAddress
                : zeroAddress
        const hookData =
            "hookData" in params && params.hookData ? params.hookData : "0x"
        salt = generateSaltForV07(
            params.eoaAddress,
            params.index,
            hookAddress,
            hookData
        )
    }

    const factoryAddress =
        entryPointVersion === "v0.6"
            ? KERNEL_ADDRESSES.FACTORY_ADDRESS_V0_6
            : KERNEL_ADDRESSES.FACTORY_ADDRESS_V0_7
    return getContractAddress({
        bytecodeHash,
        opcode: "CREATE2",
        from: factoryAddress,
        salt
    })
}
