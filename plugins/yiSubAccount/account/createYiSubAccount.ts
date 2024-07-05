import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
    toSmartAccount
} from "permissionless/accounts"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint"
import {
    type Chain,
    type Transport,
    type Client,
    encodeFunctionData,
    type Address,
    concatHex,
    toHex,
    type Hex,
    encodeAbiParameters,
    decodeAbiParameters
} from "viem"
import { YiSubAccountAbi } from "../abi/YiSubAccountAbi"
import { YiSubAccountFactoryAbi } from "../abi/YiSubAccountFactoryAbi"
import {
    getEntryPointVersion,
    getSenderAddress,
    isSmartAccountDeployed
} from "permissionless"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "@zerodev/sdk/accounts"
import type { YI_SUB_ACCOUNT_VERSION_TYPE } from "../types"
import { MAGIC_BYTES, YiSubAccountVersionToAddressesMap } from "../constants"
import { YiDelegationManagerAbi } from "../abi/YiDelegationManagerAbi"
import type { KernelSmartAccount } from "@zerodev/sdk/accounts"

export type YiSubAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "yiSubAccount", transport, chain> & {
    masterAccount: KernelSmartAccount<entryPoint, transport, chain>
    delegationManagerAddress: Address
    getCallData: (
        args: Parameters<YiSubAccount<entryPoint>["encodeCallData"]>[0]
    ) => Promise<{
        to: Address
        value: bigint
        data: Hex
    }>
}

const getYiSubAccountInitData = async ({
    masterAccountAddress
}: {
    masterAccountAddress: Address
}) => {
    return encodeFunctionData({
        abi: YiSubAccountAbi,
        functionName: "initialize",
        args: [masterAccountAddress]
    })
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param accountImplementationAddress
 * @param ecdsaValidatorAddress
 */
const getYiSubAccountInitCode = async ({
    index,
    factoryAddress,
    masterAccountAddress
}: {
    index: bigint
    factoryAddress: Address
    masterAccountAddress: Address
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = await getYiSubAccountInitData({
        masterAccountAddress
    })

    // Build the account init code
    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: YiSubAccountFactoryAbi,
            functionName: "createAccount",
            args: [initialisationData, toHex(index, { size: 32 })]
        })
    ])
}

const getYiSubAccountInitCodeWithParentInitCode = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    index,
    factoryAddress,
    masterAccount
}: {
    index: bigint
    factoryAddress: Address
    masterAccount: KernelSmartAccount<entryPoint, TTransport, TChain>
}): Promise<Hex> => {
    // Build the account initialization data
    const initialisationData = await getYiSubAccountInitData({
        masterAccountAddress: masterAccount.address
    })

    // Build the account init code
    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: YiSubAccountFactoryAbi,
            functionName: "createAccountWithParent",
            args: [
                initialisationData,
                toHex(index, { size: 32 }),
                await masterAccount.generateInitCode()
            ]
        })
    ])
}

/**
 * Check the validity of an existing account address, or fetch the pre-deterministic account address for a kernel smart wallet
 * @param client
 * @param entryPoint
 * @param initCodeProvider
 */
const getAccountAddress = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    client,
    entryPoint: entryPointAddress,
    initCodeProvider
}: {
    client: Client<TTransport, TChain, undefined>
    initCodeProvider: () => Promise<Hex>
    entryPoint: entryPoint
}): Promise<Address> => {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    // Find the init code for this account
    const initCode = await initCodeProvider()
    if (entryPointVersion === "v0.6") {
        return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
            initCode,
            entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE
        })
    }

    // Get the sender address based on the init code
    return getSenderAddress<ENTRYPOINT_ADDRESS_V07_TYPE>(client, {
        factory: parseFactoryAddressAndCallDataFromAccountInitCode(initCode)[0],
        factoryData:
            parseFactoryAddressAndCallDataFromAccountInitCode(initCode)[1],
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V07_TYPE
    })
}

export type CreateYiSubAccountParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
> = {
    entryPoint: entryPoint
    masterAccount: KernelSmartAccount<entryPoint, TTransport, TChain>
    index?: bigint
    factoryAddress?: Address
    delegationManagerAddress?: Address
    deployedAccountAddress?: Address
    yiSubAccountVersion: YI_SUB_ACCOUNT_VERSION_TYPE
}

export async function createYiSubAccount<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        entryPoint: entryPointAddress,
        masterAccount,
        yiSubAccountVersion: _,
        deployedAccountAddress,
        factoryAddress: _factoryAddress,
        delegationManagerAddress: _delegationManagerAddress,
        index = 0n
    }: CreateYiSubAccountParameters<entryPoint, TTransport, TChain>
): Promise<YiSubAccount<entryPoint, TTransport, TChain>> {
    const factoryAddress =
        _factoryAddress ??
        YiSubAccountVersionToAddressesMap["0.0.1"].factoryAddress
    const delegationManagerAddress =
        _delegationManagerAddress ??
        YiSubAccountVersionToAddressesMap["0.0.1"].delegationManagerAddress

    const generateInitCode = () =>
        getYiSubAccountInitCode({
            index,
            factoryAddress,
            masterAccountAddress: masterAccount.address
        })
    const accountAddress =
        deployedAccountAddress ??
        (await getAccountAddress<entryPoint, TTransport, TChain>({
            client,
            entryPoint: entryPointAddress,
            initCodeProvider: generateInitCode
        }))

    if (!accountAddress) throw new Error("Account address not found")

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        accountAddress
    )

    const getInitCode = async () => {
        if (smartAccountDeployed) return "0x"

        smartAccountDeployed = await isSmartAccountDeployed(
            client,
            accountAddress
        )

        if (smartAccountDeployed) return "0x"
        return generateInitCode()
    }
    const getCallData = async (
        tx: Parameters<YiSubAccount<entryPoint>["encodeCallData"]>[0]
    ) => {
        if (Array.isArray(tx)) {
            throw new Error("Batch call not supported yet")
        }
        const data = concatHex([
            accountAddress,
            encodeAbiParameters(
                [
                    { type: "bytes" },
                    { type: "bytes" },
                    { type: "bytes" },
                    { type: "bytes" }
                ],
                [await getInitCode(), "0x", "0x", "0x"]
            )
        ])
        return {
            to: delegationManagerAddress,
            data: encodeFunctionData({
                abi: YiDelegationManagerAbi,
                functionName: "redeemDelegation",
                args: [data, tx]
            }),
            value: 0n
        }
    }

    return {
        masterAccount,
        delegationManagerAddress,
        getCallData,
        ...toSmartAccount({
            client,
            source: "yiSubAccount",
            entryPoint: entryPointAddress,
            address: accountAddress,
            encodeCallData: async (tx) => {
                return masterAccount.encodeCallData(await getCallData(tx))
            },
            encodeDeployCallData: async (_tx) => {
                throw new Error("encodeDeployCallData not supported yet")
            },
            getDummySignature: async () => {
                throw new Error("getDummySignature not supported")
            },
            async getFactory() {
                if (smartAccountDeployed) return undefined

                smartAccountDeployed = await isSmartAccountDeployed(
                    client,
                    accountAddress
                )

                if (smartAccountDeployed) return undefined

                return factoryAddress
            },
            async getFactoryData() {
                if (smartAccountDeployed) return undefined

                smartAccountDeployed = await isSmartAccountDeployed(
                    client,
                    accountAddress
                )

                if (smartAccountDeployed) return undefined

                return parseFactoryAddressAndCallDataFromAccountInitCode(
                    await getYiSubAccountInitCodeWithParentInitCode({
                        factoryAddress,
                        index,
                        masterAccount
                    })
                )[1]
            },
            getInitCode,
            getNonce: () => {
                throw new Error("getNonce not supported")
            },
            signMessage: async ({ message }) => {
                let masterSignature = await masterAccount.signMessage({
                    message
                })

                if (
                    masterSignature
                        .toLowerCase()
                        .includes(MAGIC_BYTES.substring(2))
                ) {
                    masterSignature = masterSignature.replace(
                        MAGIC_BYTES.substring(2),
                        ""
                    ) as Hex
                    const decodedSig = decodeAbiParameters(
                        [
                            {
                                type: "address",
                                name: "create2Factory"
                            },
                            {
                                type: "bytes",
                                name: "factoryCalldata"
                            },
                            {
                                type: "bytes",
                                name: "originalERC1271Signature"
                            }
                        ],
                        masterSignature
                    )
                    return decodedSig[2]
                }
                return masterSignature
            },
            signTransaction: () => {
                throw new SignTransactionNotSupportedBySmartAccount()
            },
            signTypedData: async (typedData) => {
                let masterSignature = await masterAccount.signTypedData(
                    typedData
                )
                if (
                    masterSignature
                        .toLowerCase()
                        .includes(MAGIC_BYTES.substring(2))
                ) {
                    masterSignature = masterSignature.replace(
                        MAGIC_BYTES.substring(2),
                        ""
                    ) as Hex
                    const decodedSig = decodeAbiParameters(
                        [
                            {
                                type: "address",
                                name: "create2Factory"
                            },
                            {
                                type: "bytes",
                                name: "factoryCalldata"
                            },
                            {
                                type: "bytes",
                                name: "originalERC1271Signature"
                            }
                        ],
                        masterSignature
                    )
                    return decodedSig[2]
                }
                return masterSignature
            },
            signUserOperation: () => {
                throw new Error("signUserOperation not supported")
            }
        })
    }
}
