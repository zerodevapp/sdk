import type { KernelValidator } from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import MerkleTree from "merkletreejs"
import { type UserOperation, getUserOperationHash } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    type TypedDataDefinition,
    concatHex,
    encodeAbiParameters,
    keccak256
} from "viem"
import { toAccount } from "viem/accounts"
import { signMessage, signTypedData } from "viem/actions"
import { getChainId } from "viem/actions"
import { MULTI_CHAIN_VALIDATOR_ADDRESS } from "./constants.js"

export async function toMultiChainValidator<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entryPoint: entryPointAddress,
        validatorAddress
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        entryPoint: entryPoint
        validatorAddress?: Address
    }
): Promise<KernelValidator<entryPoint, "MultiChainValidator">> {
    validatorAddress = validatorAddress ?? MULTI_CHAIN_VALIDATOR_ADDRESS
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

    return {
        ...account,
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "MultiChainValidator",
        getIdentifier() {
            return validatorAddress ?? MULTI_CHAIN_VALIDATOR_ADDRESS
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
        async signUserOperation(
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            const hash = getUserOperationHash<entryPoint>({
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
        async getDummySignature(_userOperation) {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },
        async getMultiUserOpDummySignature(userOperation, numOfUserOps) {
            const userOpHash = getUserOperationHash<entryPoint>({
                userOperation,
                entryPoint: entryPointAddress,
                chainId: chainId
            })

            const dummyUserOpHash = `0x${"a".repeat(64)}`
            const dummyLeaves = Array(numOfUserOps - 1).fill(dummyUserOpHash)

            const leaves = [userOpHash, ...dummyLeaves]

            const merkleTree = new MerkleTree(leaves, keccak256, {
                sortPairs: true
            })

            const merkleRoot = merkleTree.getHexRoot() as Hex
            const merkleProof = merkleTree.getHexProof(userOpHash) as Hex[]

            const dummyEcdsaSig =
                "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

            const encodedMerkleProof = encodeAbiParameters(
                [
                    { name: "dummyUserOpHash", type: "bytes32" },
                    { name: "proof", type: "bytes32[]" }
                ],
                [userOpHash, merkleProof]
            )

            const finalDummySig = concatHex([
                dummyEcdsaSig,
                merkleRoot,
                encodedMerkleProof
            ])

            return finalDummySig
        },
        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}
