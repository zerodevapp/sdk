import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation
} from "@zerodev/sdk"
import MerkleTree from "merkletreejs"
import type { Assign, Chain, Client, Hex, Narrow, OneOf, Transport } from "viem"
import {
    type DeriveEntryPointVersion,
    type DeriveSmartAccount,
    type EntryPointVersion,
    type GetSmartAccountParameter,
    type PrepareUserOperationReturnType,
    type SmartAccount,
    type UserOperation,
    type UserOperationCalls,
    type UserOperationRequest,
    getUserOperationHash
} from "viem/account-abstraction"
import {
    concatHex,
    encodeAbiParameters,
    hashMessage,
    keccak256,
    parseAccount
} from "viem/utils"

export type SignUserOperationsRequest<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[],
    //
    _derivedAccount extends SmartAccount | undefined = DeriveSmartAccount<
        account,
        accountOverride
    >,
    _derivedVersion extends
        EntryPointVersion = DeriveEntryPointVersion<_derivedAccount>
> = Assign<
    UserOperationRequest<_derivedVersion>,
    OneOf<{ calls: UserOperationCalls<Narrow<calls>> } | { callData: Hex }> & {
        chainId: number
    }
>

export type SignUserOperationsParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[],
    request extends SignUserOperationsRequest<
        account,
        accountOverride,
        calls
    > = SignUserOperationsRequest<account, accountOverride, calls>
> = { userOperations: request[] } & GetSmartAccountParameter<
    account,
    accountOverride
>

export type SignUserOperationsReturnType = PrepareUserOperationReturnType[]

export async function signUserOperations<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args_: SignUserOperationsParameters<account, accountOverride, calls>
): Promise<SignUserOperationsReturnType> {
    const args = args_ as SignUserOperationsParameters
    const { account: account_ = client.account, userOperations } = args
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>

    const userOpHashes = userOperations.map((userOp) => {
        return getUserOperationHash({
            userOperation: {
                ...userOp,
                signature: "0x"
            } as UserOperation,
            entryPointAddress: account.entryPoint.address,
            entryPointVersion: account.entryPoint.version,
            chainId: userOp.chainId
        })
    })

    const merkleTree = new MerkleTree(userOpHashes, keccak256, {
        sortPairs: true
    })

    const merkleRoot = merkleTree.getHexRoot() as Hex
    const toEthSignedMessageHash = hashMessage({ raw: merkleRoot })

    const passkeySig = await account.kernelPluginManager.signMessage({
        message: {
            raw: toEthSignedMessageHash
        }
    })

    const encodeMerkleDataWithSig = (userOpHash: Hex) => {
        const merkleProof = merkleTree.getHexProof(userOpHash) as Hex[]

        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "proof", type: "bytes32[]" }],
            [merkleProof]
        )
        const merkleData = concatHex([merkleRoot, encodedMerkleProof])
        return encodeAbiParameters(
            [
                {
                    name: "merkleData",
                    type: "bytes"
                },
                {
                    name: "signature",
                    type: "bytes"
                }
            ],
            [merkleData, passkeySig]
        )
    }

    const signedMultiUserOps = userOperations.map((userOp, index) => {
        return {
            ...userOp,
            signature: encodeMerkleDataWithSig(userOpHashes[index])
        }
    })

    return signedMultiUserOps as SignUserOperationsReturnType
}
