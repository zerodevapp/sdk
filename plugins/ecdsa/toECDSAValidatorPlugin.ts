import { KERNEL_ADDRESSES } from "@kerneljs/core"
import type { KernelValidator } from "@kerneljs/core/types"
import { ValidatorMode } from "@kerneljs/core/types"
import { type UserOperation, getUserOperationHash } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import {
    type Address,
    type Chain,
    type Client,
    type LocalAccount,
    type Transport
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
): Promise<KernelValidator<"ECDSAValidator">> {
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
        source: "ECDSAValidator",

        shouldDelegateViaFallback(): boolean {
            return true
        },
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
            return signature
        },

        // Get simple dummy signature
        async getDummySignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },

        async getValidatorMode() {
            return ValidatorMode.sudo
        }
    }
}
