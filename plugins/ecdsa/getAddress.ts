import {
    constants,
    KernelAccountAbi,
    KernelV3InitAbi,
    KernelV3_1AccountAbi,
    validateKernelVersionWithEntryPoint
} from "@zerodev/sdk"
import type { EntryPointType, GetKernelVersion } from "@zerodev/sdk/types"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
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
import type { EntryPointVersion } from "viem/account-abstraction"
import { getValidatorAddress } from "./toECDSAValidatorPlugin.js"

const getInitCodeHash = async <entryPointVersion extends EntryPointVersion>(
    publicClient: PublicClient,
    entryPoint: EntryPointType<entryPointVersion>,
    kernelVersion: GetKernelVersion<entryPointVersion>
): Promise<Hex> => {
    validateKernelVersionWithEntryPoint(entryPoint.version, kernelVersion)
    const addresses = constants.KernelVersionToAddressesMap[kernelVersion]
    if (entryPoint.version === "0.6") {
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
    validatorAddress: Address,
    kernelVersion: KERNEL_VERSION_TYPE,
    initConfig: Hex[]
) => {
    const encodedIndex = toHex(index, { size: 32 })
    let initData: Hex
    if (kernelVersion === "0.3.0") {
        initData = encodeFunctionData({
            abi: KernelV3InitAbi,
            functionName: "initialize",
            args: [
                concatHex([
                    constants.VALIDATOR_TYPE.SECONDARY,
                    validatorAddress
                ]),
                hookAddress,
                eoaAddress,
                hookData
            ]
        })
        const packedData = concatHex([initData, encodedIndex])
        return keccak256(packedData)
    }
    initData = encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "initialize",
        args: [
            concatHex([constants.VALIDATOR_TYPE.SECONDARY, validatorAddress]),
            hookAddress,
            eoaAddress,
            hookData,
            initConfig
        ]
    })
    const packedData = concatHex([initData, encodedIndex])
    return keccak256(packedData)
}

export type GetKernelAddressFromECDSAParams<
    entryPointVersion extends EntryPointVersion
> = {
    entryPoint: EntryPointType<entryPointVersion>
    kernelVersion: GetKernelVersion<entryPointVersion>
    eoaAddress: Address
    index: bigint
    hookAddress?: entryPointVersion extends "0.6" ? never : Address
    hookData?: entryPointVersion extends "0.6" ? never : Hex
    initConfig?: entryPointVersion extends "0.6" ? never : Hex[]
} & (
    | { publicClient: PublicClient; initCodeHash?: never }
    | { publicClient?: never; initCodeHash: Hex }
)

export async function getKernelAddressFromECDSA<
    entryPointVersion extends EntryPointVersion
>(params: GetKernelAddressFromECDSAParams<entryPointVersion>) {
    validateKernelVersionWithEntryPoint(
        params.entryPoint.version,
        params.kernelVersion
    )
    const kernelAddresses =
        constants.KernelVersionToAddressesMap[params.kernelVersion]
    const ecdsaValidatorAddress = getValidatorAddress(
        params.entryPoint,
        params.kernelVersion
    )
    const bytecodeHash = await (async () => {
        if ("initCodeHash" in params && params.initCodeHash) {
            return params.initCodeHash
        }
        if ("publicClient" in params && params.publicClient) {
            return await getInitCodeHash(
                params.publicClient,
                params.entryPoint,
                params.kernelVersion
            )
        }
        throw new Error("Either initCodeHash or publicClient must be provided")
    })()
    let salt: Hex
    if (params.entryPoint.version === "0.6") {
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
        const initConfig =
            "initConfig" in params && params.initConfig ? params.initConfig : []
        salt = generateSaltForV07(
            params.eoaAddress,
            params.index,
            hookAddress,
            hookData,
            ecdsaValidatorAddress,
            params.kernelVersion,
            initConfig
        )
    }

    return getContractAddress({
        bytecodeHash,
        opcode: "CREATE2",
        from: kernelAddresses.factoryAddress,
        salt
    })
}
