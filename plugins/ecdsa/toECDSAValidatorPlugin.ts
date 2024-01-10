import { KERNEL_ADDRESSES } from "@kerneljs/core"
import type { KernelPlugin } from "@kerneljs/core/types"
import { type UserOperation, getUserOperationHash } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    concatHex,
    hexToBigInt,
    pad,
    toHex
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage, signTypedData } from "viem/actions"
import { getChainId } from "viem/actions"
import { ECDSA_VALIDATOR_ADDRESS } from "./index.js"

export async function signerToEcdsaValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain>,
    {
        signer,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        validatorAddress = ECDSA_VALIDATOR_ADDRESS
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<KernelPlugin<"ECDSAValidator", TTransport, TChain>> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
        }
    } as LocalAccount

    // Fetch chain id
    const chainId = await getChainId(client)

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message })
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            return signTypedData(client, { account: viemSigner, ...typedData })
        }
    })

    return {
        ...account,
        address: validatorAddress,
        signer: viemSigner,
        client: client,
        entryPoint: entryPoint,
        source: "ECDSAValidator",

        async getEnableData() {
            return viemSigner.address
        },
        async getNonceKey() {
            return 0n
        },
        // Sign a user operation
        async signUserOperation(userOperation: UserOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPoint,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
            // Always use the sudo mode, since we will use external paymaster
            return concatHex(["0x00000000", signature])
        },

        // Get simple dummy signature
        async getDummySignature() {
            return "0x00000000fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },
        async getPluginEnableSignature(
            accountAddress: Address,
            plugin: KernelPlugin
        ): Promise<Hex> {
            const sender = accountAddress
            const executorData = plugin.getExecutorData()
            if (!executorData.selector || !executorData.executor) {
                throw new Error("Invalid executor data")
            }
            const ownerSig = await account.signTypedData({
                domain: {
                    name: "Kernel",
                    version: "0.2.3",
                    chainId,
                    verifyingContract: sender
                },
                types: {
                    ValidatorApproved: [
                        { name: "sig", type: "bytes4" },
                        { name: "validatorData", type: "uint256" },
                        { name: "executor", type: "address" },
                        { name: "enableData", type: "bytes" }
                    ]
                },
                message: {
                    sig: executorData.selector,
                    validatorData: hexToBigInt(
                        concatHex([
                            pad(toHex(executorData.validUntil ?? 0), {
                                size: 6
                            }),
                            pad(toHex(executorData.validAfter ?? 0), {
                                size: 6
                            }),
                            plugin.address
                        ]),
                        { size: 32 }
                    ),
                    executor: executorData.executor as Address,
                    enableData: await plugin.getEnableData(sender)
                },
                primaryType: "ValidatorApproved"
            })
            return ownerSig
        },
        getExecutorData: () => {
            throw new Error("Not implemented")
        }
    }
}
