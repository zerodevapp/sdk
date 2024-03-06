import {
    getAccountNonce,
    getSenderAddress,
    getUserOperationHash
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    SmartAccountSigner
} from "permissionless/accounts"
import {
    Address,
    Chain,
    Client,
    Hash,
    Hex,
    Transport,
    TypedDataDefinition,
    concatHex,
    encodeFunctionData,
    getTypesForEIP712Domain,
    hashMessage,
    hashTypedData,
    validateTypedData
} from "viem"
import { toAccount } from "viem/accounts"
import { getBytecode, getChainId } from "viem/actions"
import { wrapSignatureWith6492 } from "../utils/6492.js"
import { parseFactoryAddressAndCallDataFromAccountInitCode } from "../utils/index.js"
import { KernelSmartAccount } from "./createKernelAccount"

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

const KERNEL_V1_ADDRESSES: {
    FACTORY_ADDRESS: Address
    ENTRYPOINT_V0_6: Address
} = {
    FACTORY_ADDRESS: "0x4E4946298614FC299B50c947289F4aD0572CB9ce",
    ENTRYPOINT_V0_6: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
}

export async function createKernelV1Account<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = string,
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entrypoint = KERNEL_V1_ADDRESSES.ENTRYPOINT_V0_6,
        index = 0n,
        factoryAddress = KERNEL_V1_ADDRESSES.FACTORY_ADDRESS,
        deployedAccountAddress
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        entrypoint?: Address
        index?: bigint
        factoryAddress?: Address
        deployedAccountAddress?: Address
    }
): Promise<KernelSmartAccount<TTransport, TChain>> {
    if (entrypoint !== KERNEL_V1_ADDRESSES.ENTRYPOINT_V0_6) {
        throw new Error("Only EntryPoint 0.6 is supported")
    }

    // Fetch chain id
    const chainId = await getChainId(client)

    const getAccountInitCode = async (): Promise<Hex> => {
        return concatHex([
            KERNEL_V1_ADDRESSES.FACTORY_ADDRESS,
            encodeFunctionData({
                abi: createAccountAbi,
                functionName: "createAccount",
                args: [signer.address, index]
            })
        ]) as Hex
    }

    const initCode = await getAccountInitCode()
    const accountAddress = await getSenderAddress(client, {
        initCode,
        entryPoint: entrypoint
    })

    if (!accountAddress) throw new Error("Account address not found")

    const account = toAccount({
        address: accountAddress,
        async signMessage({ message }) {
            const hash = hashMessage(message)
            const [isDeployed, signature] = await Promise.all([
                isAccountDeployed(),
                signer.signMessage({ message: hash })
            ])
            return create6492Signature(isDeployed, signature)
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            const types = {
                EIP712Domain: getTypesForEIP712Domain({
                    domain: typedData.domain
                }),
                ...typedData.types
            }

            // Need to do a runtime validation check on addresses, byte ranges, integer ranges, etc
            // as we can't statically check this with TypeScript.
            validateTypedData({
                domain: typedData.domain,
                message: typedData.message,
                primaryType: typedData.primaryType,
                types: types
            } as TypedDataDefinition)

            const typedHash = hashTypedData(typedData)
            const [isDeployed, signature] = await Promise.all([
                isAccountDeployed(),
                signer.signMessage({ message: typedHash })
            ])
            return create6492Signature(isDeployed, signature)
        }
    })

    const isAccountDeployed = async (): Promise<boolean> => {
        const contractCode = await getBytecode(client, {
            address: accountAddress
        })

        return (contractCode?.length ?? 0) > 2
    }

    const create6492Signature = async (
        isDeployed: boolean,
        signature: Hash
    ): Promise<Hash> => {
        if (isDeployed) {
            return signature
        }

        const [factoryAddress, factoryCalldata] =
            parseFactoryAddressAndCallDataFromAccountInitCode(
                await getAccountInitCode()
            )

        return wrapSignatureWith6492({
            factoryAddress,
            factoryCalldata,
            signature
        })
    }

    return {
        ...account,
        async getNonce() {
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entrypoint
            })
        },
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entrypoint,
                chainId: chainId
            })
            const signature = await account.signMessage({ message: hash })
            return signature
        },
        async getInitCode() {
            if (await isAccountDeployed()) {
                return "0x"
            } else {
                return getAccountInitCode()
            }
        },
        async encodeCallData(_tx) {},
        async getDummySignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },
        async encodeDeployCallData() {}
    }
}
