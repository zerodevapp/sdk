import { getAccountNonce, getSenderAddress } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    SmartAccount
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    encodeFunctionData
} from "viem"
import { toAccount } from "viem/accounts"
import { getBytecode, signMessage, signTypedData } from "viem/actions"
import { KernelPlugin } from "../../types/kernel"
import { KernelExecuteAbi, KernelInitAbi } from "./abi/KernelAccountAbi.js"

export type KernelSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<"kernelSmartAccount", transport, chain>

/**
 * The account creation ABI for a kernel smart account (from the KernelFactory)
 */
const createAccountAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_implementation",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes"
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256"
            }
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "address",
                name: "proxy",
                type: "address"
            }
        ],
        stateMutability: "payable",
        type: "function"
    }
] as const

/**
 * Default addresses for kernel smart account
 */
export const KERNEL_ADDRESSES: {
    ECDSA_VALIDATOR: Address
    ACCOUNT_V2_2_LOGIC: Address
    FACTORY_ADDRESS: Address
} = {
    ECDSA_VALIDATOR: "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390",
    ACCOUNT_V2_2_LOGIC: "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5",
    FACTORY_ADDRESS: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3"
}

/**
 * Get the account initialization code for a kernel smart account
 * @param owner
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async ({
    owner,
    index,
    factoryAddress,
    accountLogicAddress,
    validatorAddress,
    enableData
}: {
    owner: Address
    index: bigint
    factoryAddress: Address
    accountLogicAddress: Address
    validatorAddress: Address
    enableData: Promise<Hex>
}): Promise<Hex> => {
    if (!owner) throw new Error("Owner account not found")

    // Build the account initialization data
    const initialisationData = encodeFunctionData({
        abi: KernelInitAbi,
        functionName: "initialize",
        args: [validatorAddress, await enableData]
    })

    // Build the account init code
    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: createAccountAbi,
            functionName: "createAccount",
            args: [accountLogicAddress, initialisationData, index]
        }) as Hex
    ])
}

/**
 * Check the validity of an existing account address, or fetch the pre-deterministic account address for a kernel smart wallet
 * @param client
 * @param entryPoint
 * @param initCodeProvider
 */
const getAccountAddress = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    client,
    entryPoint,
    initCodeProvider
}: {
    client: Client<TTransport, TChain>
    initCodeProvider: () => Promise<Hex>
    entryPoint: Address
}): Promise<Address> => {
    // Find the init code for this account
    const initCode = await initCodeProvider()

    // Get the sender address based on the init code
    return getSenderAddress(client, {
        initCode,
        entryPoint
    })
}

/**
 * Build a kernel smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 * @param deployedAccountAddress
 */
export async function createKernelAccount<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TPlugin extends KernelPlugin<string, TTransport, TChain> = KernelPlugin<
        "ECDSAValidator",
        TTransport,
        TChain
    >
>(
    client: Client<TTransport, TChain>,
    {
        plugin,
        entryPoint,
        index = 0n,
        factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
        accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_V2_2_LOGIC,
        deployedAccountAddress
    }: {
        plugin: TPlugin
        entryPoint: Address
        index?: bigint
        factoryAddress?: Address
        accountLogicAddress?: Address
        deployedAccountAddress?: Address
    }
): Promise<KernelSmartAccount<TTransport, TChain>> {
    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            owner: plugin.signer.address,
            index,
            factoryAddress,
            accountLogicAddress,
            validatorAddress: plugin.address,
            enableData: plugin.getEnableData()
        })

    // Fetch account address and chain id
    const [accountAddress] = await Promise.all([
        deployedAccountAddress ??
            getAccountAddress<TTransport, TChain>({
                client,
                entryPoint,
                initCodeProvider: generateInitCode
            })
    ])

    if (!accountAddress) throw new Error("Account address not found")

    // Build the EOA Signer
    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            return signMessage(client, { account: plugin.signer, message })
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            return signTypedData(client, {
                account: plugin.signer,
                ...typedData
            })
        }
    })

    return {
        ...account,
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPoint,
        source: "kernelSmartAccount",

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPoint
            })
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            return plugin.signUserOperation(userOperation)
        },

        // Encode the init code
        async getInitCode() {
            const contractCode = await getBytecode(client, {
                address: accountAddress
            })

            if ((contractCode?.length ?? 0) > 2) return "0x"

            return generateInitCode()
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error("Kernel account doesn't support account deployment")
        },

        // Encode a call
        async encodeCallData(_tx) {
            if (Array.isArray(_tx)) {
                // Encode a batched call
                return encodeFunctionData({
                    abi: KernelExecuteAbi,
                    functionName: "executeBatch",
                    args: [
                        _tx.map((tx) => ({
                            to: tx.to,
                            value: tx.value,
                            data: tx.data
                        }))
                    ]
                })
            }
            // Encode a simple call
            return encodeFunctionData({
                abi: KernelExecuteAbi,
                functionName: "execute",
                args: [_tx.to, _tx.value, _tx.data, 0]
            })
        },

        // Get simple dummy signature
        async getDummySignature() {
            return plugin.getDummySignature()
        }
    }
}
