import type { KernelPlugin } from "@kerneljs/core/types/kernel"
import { getUserOperationHash } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type LocalAccount,
    type Transport,
    concatHex
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage, signTypedData } from "viem/actions"
import { getChainId } from "viem/actions"
import { ENTRYPOINT_0_6, KERNEL_ADDRESSES } from "./index"

export async function signerToEcdsaValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain>,
    {
        signer,
        entryPoint = ENTRYPOINT_0_6,
        validatorAddress = KERNEL_ADDRESSES.ECDSA_VALIDATOR
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
        async signUserOperation(userOperation) {
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
        }
    }
}
