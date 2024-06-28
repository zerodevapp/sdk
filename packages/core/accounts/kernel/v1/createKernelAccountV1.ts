import {
    ENTRYPOINT_ADDRESS_V06,
    getAccountNonce,
    getEntryPointVersion,
    getSenderAddress,
    getUserOperationHash,
    isSmartAccountDeployed
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types/entrypoint.js"
import {
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type LocalAccount,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    concatHex,
    encodeFunctionData
} from "viem"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage, signTypedData } from "viem/actions"
import type { KernelEncodeCallDataArgs } from "../../../types/kernel.js"
import { wrapSignatureWith6492 } from "../../utils/6492.js"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "../../utils/index.js"
import {
    MULTISEND_ADDRESS,
    encodeMultiSend,
    multiSendAbi
} from "../../utils/multisend.js"
import type { KernelSmartAccount } from "../createKernelAccount.js"

export type KernelSmartAccountV1<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = Omit<
    KernelSmartAccount<entryPoint, transport, chain>,
    "kernelPluginManager" | "kernelVersion"
>

const createAccountAbi = [
    {
        inputs: [
            { internalType: "address", name: "_owner", type: "address" },
            { internalType: "uint256", name: "_index", type: "uint256" }
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "contract EIP1967Proxy",
                name: "proxy",
                type: "address"
            }
        ],
        stateMutability: "nonpayable",
        type: "function"
    }
]

const executeAndRevertAbi = [
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "bytes", name: "data", type: "bytes" },
            { internalType: "enum Operation", name: "operation", type: "uint8" }
        ],
        name: "executeAndRevert",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
]

const KERNEL_V1_ADDRESSES: {
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    FACTORY_ADDRESS: "0x4E4946298614FC299B50c947289F4aD0572CB9ce",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

export async function createKernelAccountV1<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = string,
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entryPoint: entryPointAddress,
        index = 0n
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        entryPoint: entryPoint
        index?: bigint
    }
): Promise<KernelSmartAccountV1<entryPoint, TTransport, TChain>> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    if (
        entryPointVersion !== "v0.6" ||
        entryPointAddress !== ENTRYPOINT_ADDRESS_V06
    ) {
        throw new Error("Only EntryPoint 0.6 is supported")
    }

    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
        }
    } as LocalAccount

    // Fetch chain id
    const chainId = await getChainId(client)

    const generateInitCode = async (): Promise<Hex> => {
        return concatHex([
            KERNEL_V1_ADDRESSES.FACTORY_ADDRESS,
            encodeFunctionData({
                abi: createAccountAbi,
                functionName: "createAccount",
                args: [signer.address, index]
            })
        ]) as Hex
    }

    const initCode = await generateInitCode()
    const accountAddress = await getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(
        client,
        {
            initCode,
            entryPoint: entryPointAddress
        }
    )

    if (!accountAddress) throw new Error("Account address not found")

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        accountAddress
    )

    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            const [isDeployed, signature] = await Promise.all([
                isSmartAccountDeployed(client, accountAddress),
                signer.signMessage({ message })
            ])
            return create6492Signature(isDeployed, signature)
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
                client,
                {
                    account: viemSigner,
                    ...typedData
                }
            )
        }
    })

    // const isAccountDeployed = async (): Promise<boolean> => {
    //     const contractCode = await getBytecode(client, {
    //         address: accountAddress
    //     })

    //     return (contractCode?.length ?? 0) > 2
    // }

    const create6492Signature = async (
        isDeployed: boolean,
        signature: Hash
    ): Promise<Hash> => {
        if (isDeployed) {
            return signature
        }

        const [factoryAddress, factoryCalldata] =
            parseFactoryAddressAndCallDataFromAccountInitCode(
                await generateInitCode()
            )

        return wrapSignatureWith6492({
            factoryAddress,
            factoryCalldata,
            signature
        })
    }

    return {
        ...account,
        generateInitCode,
        encodeModuleInstallCallData: async () => {
            throw new Error("Not implemented")
        },
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPointAddress,
        source: "kernelSmartAccount",
        async getFactory() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined

            return KERNEL_V1_ADDRESSES.FACTORY_ADDRESS
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined

            return parseFactoryAddressAndCallDataFromAccountInitCode(
                await generateInitCode()
            )[1]
        },
        async getNonce() {
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPointAddress
            })
        },
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPointAddress,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
            return signature
        },
        async getInitCode() {
            if (smartAccountDeployed) return "0x"

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return "0x"
            return generateInitCode()
        },
        async encodeCallData(_tx) {
            const tx = _tx as KernelEncodeCallDataArgs

            if (Array.isArray(tx)) {
                // Encode a batched call using multiSend
                const multiSendCallData = encodeFunctionData({
                    abi: multiSendAbi,
                    functionName: "multiSend",
                    args: [encodeMultiSend(tx)]
                })

                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [MULTISEND_ADDRESS, 0n, multiSendCallData, 1n]
                })
            }

            // Default to `call`
            if (!tx.callType || tx.callType === "call") {
                if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
                    return tx.data
                }

                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [tx.to, tx.value || 0n, tx.data, 0n]
                })
            }

            if (tx.callType === "delegatecall") {
                return encodeFunctionData({
                    abi: executeAndRevertAbi,
                    functionName: "executeAndRevert",
                    args: [tx.to, tx.value || 0n, tx.data, 1n]
                })
            }

            throw new Error("Invalid call type")
        },
        async encodeDeployCallData() {
            return "0x"
        },
        async getDummySignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        }
    }
}
