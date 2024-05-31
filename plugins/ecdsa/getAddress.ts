import {
    constants,
    KernelAccountAbi,
    KernelV3InitAbi,
    validateKernelVersionWithEntryPoint
} from "@zerodev/sdk"
import type { GetKernelVersion } from "@zerodev/sdk/types"
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
import { getValidatorAddress } from "./toECDSAValidatorPlugin.js"

const getInitCodeHash = async <entryPoint extends EntryPoint>(
    publicClient: PublicClient,
    entryPointAddress: entryPoint,
    kernelVersion: GetKernelVersion<entryPoint>
): Promise<Hex> => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)
    validateKernelVersionWithEntryPoint(entryPointAddress, kernelVersion)
    const addresses = constants.KernelVersionToAddressesMap[kernelVersion]
    if (entryPointVersion === "v0.6") {
        return await initCodeHashV0_6(publicClient, addresses.factoryAddress)
    }
    return initCodeHashV0_7(addresses.accountImplementationAddress)
}
const initCodeHashV0_6 = async (
    publicClient: PublicClient,
    factoryAddress: Address
) => {
    const factoryContract = getContract({
        address: factoryAddress,
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

const generateSaltForV06 = (
    eoaAddress: Address,
    index: bigint,
    validatorAddress: Address
) => {
    const encodedIndex = toHex(index, { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "initialize",
        args: [validatorAddress, eoaAddress]
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
    hookData: Hex,
    validatorAddress: Address
) => {
    const encodedIndex = toHex(index, { size: 32 })
    const initData = encodeFunctionData({
        abi: KernelV3InitAbi,
        functionName: "initialize",
        args: [
            concatHex([constants.VALIDATOR_TYPE.SECONDARY, validatorAddress]),
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
    kernelVersion: GetKernelVersion<entryPoint>
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
    if (params.kernelVersion === "0.0.2") {
    }
    const entryPointVersion = getEntryPointVersion(params.entryPointAddress)
    validateKernelVersionWithEntryPoint(
        params.entryPointAddress,
        params.kernelVersion
    )
    const kernelAddresses =
        constants.KernelVersionToAddressesMap[params.kernelVersion]
    const ecdsaValidatorAddress = getValidatorAddress(
        params.entryPointAddress,
        params.kernelVersion
    )
    const bytecodeHash = await (async () => {
        if ("initCodeHash" in params && params.initCodeHash) {
            return params.initCodeHash
        }
        if ("publicClient" in params && params.publicClient) {
            return await getInitCodeHash(
                params.publicClient,
                params.entryPointAddress,
                params.kernelVersion
            )
        }
        throw new Error("Either initCodeHash or publicClient must be provided")
    })()
    let salt: Hex
    if (entryPointVersion === "v0.6") {
        salt = generateSaltForV06(
            params.eoaAddress,
            params.index,
            ecdsaValidatorAddress
        )
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
            hookData,
            ecdsaValidatorAddress
        )
    }

    return getContractAddress({
        bytecodeHash,
        opcode: "CREATE2",
        from: kernelAddresses.factoryAddress,
        salt
    })
}
