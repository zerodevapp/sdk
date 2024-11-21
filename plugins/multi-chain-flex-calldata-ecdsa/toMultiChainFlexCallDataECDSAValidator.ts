import {
    SignTransactionNotSupportedBySmartAccountError,
    toSigner
} from "@zerodev/sdk"
import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator,
    Signer
} from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import type { Address, Client, Hex, TypedDataDefinition } from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { signMessage } from "viem/actions"
import { getChainId } from "viem/actions"
import { MULTI_CHAIN_ECDSA_VALIDATOR_ADDRESS } from "./constants.js"
import { ecdsaGetMultiUserOpDummySignature } from "./utils/ecdsaGetMultiUserOpDummySignature.js"

export async function toMultiChainFlexCallDataECDSAValidator<
    entryPointVersion extends EntryPointVersion = "0.7"
>(
    client: Client,
    {
        signer,
        entryPoint,
        kernelVersion: _,
        validatorAddress: validatorAddress_,
        multiChainIds
    }: {
        signer: Signer
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
        validatorAddress?: Address
        multiChainIds?: number[]
    }
): Promise<KernelValidator<"MultiChainFlexCallDataECDSAValidator">> {
    const validatorAddress =
        validatorAddress_ ?? MULTI_CHAIN_ECDSA_VALIDATOR_ADDRESS
    // Get the private key related account
    const viemSigner = await toSigner({ signer })

    // Fetch chain id
    const chainId = await getChainId(client)

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message })
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccountError()
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
        supportedKernelVersions: ">=0.3.0",
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "MultiChainFlexCallDataECDSAValidator",
        getIdentifier() {
            return validatorAddress ?? MULTI_CHAIN_ECDSA_VALIDATOR_ADDRESS
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
        async signUserOperation(userOperation) {
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
        async getStubSignature(userOperation) {
            if (!multiChainIds)
                return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
            return ecdsaGetMultiUserOpDummySignature(
                {
                    ...userOperation,
                    maxFeePerGas: userOperation.maxFeePerGas ?? 0n,
                    maxPriorityFeePerGas:
                        userOperation.maxPriorityFeePerGas ?? 0n,
                    callGasLimit: 0n,
                    preVerificationGas: 0n,
                    verificationGasLimit: 0n
                } as UserOperation,
                multiChainIds.length,
                entryPoint as EntryPointType<"0.7">,
                chainId
            )
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}
