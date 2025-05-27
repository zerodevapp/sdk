import type { TypedData } from "abitype"
import type { Address, Client, Hex, TypedDataDefinition } from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash,
    getUserOperationTypedData
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage, signTypedData } from "viem/actions"
import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator,
    Signer
} from "../../types/index.js"
import { toSigner } from "../../utils/toSigner.js"

export async function signerTo7702Validator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        signer,
        entryPoint,
        kernelVersion
    }: {
        signer: Signer
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
    }
): Promise<KernelValidator<"EIP7702Validator">> {
    const viemSigner = await toSigner({ signer })

    // Fetch chain id
    const chainId = client.chain?.id ?? (await getChainId(client))

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message })
        },
        async signTransaction(_, __) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return viemSigner.signTypedData(typedData)
        }
    })

    return {
        ...account,
        supportedKernelVersions: kernelVersion,
        validatorType: "SECONDARY",
        address: viemSigner.address,
        source: "EIP7702Validator",
        getIdentifier() {
            return "0x"
        },

        async getEnableData() {
            return viemSigner.address
        },
        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },
        // Sign a user operation
        async signUserOperation(userOperation) {
            if (entryPoint.version === "0.8") {
                const signature = await signTypedData(client, {
                    account: viemSigner,
                    ...getUserOperationTypedData({
                        userOperation,
                        chainId,
                        entryPointAddress: entryPoint.address
                    })
                })
                return signature
            }
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
            return signature
        },

        // Get simple dummy signature
        async getStubSignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}
