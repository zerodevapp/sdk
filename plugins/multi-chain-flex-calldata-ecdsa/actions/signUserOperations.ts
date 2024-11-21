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
    decodeAbiParameters,
    encodeAbiParameters,
    keccak256,
    parseAccount,
    slice
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
    _derivedVersion extends EntryPointVersion = DeriveEntryPointVersion<_derivedAccount>
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
> = {
    userOperations: request[]
} & GetSmartAccountParameter<account, accountOverride>

export type FlexData = {
    offset: number
    value: Hex
}

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

    // userOperations.map(async (userOp)=> {
    //     if (userOp.callData && account.decodeCalls) {
    //         const index = userOp.callData.indexOf("fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c")

    //         const calls = await account.decodeCalls(userOp.callData)
    //         calls[0].callType

    //         const callDataSig = slice(userOp.callData, 0, 4) ===
    //     }
    // })

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
    const ecdsaSig = await account.kernelPluginManager.signMessage({
        message: {
            raw: merkleRoot
        }
    })

    const encodeMerkleDataWithSig = (
        userOpHash: Hex,
        flexCallData: FlexData[]
    ) => {
        const merkleProof = merkleTree.getHexProof(userOpHash) as Hex[]
        const encodedMerkleProof = encodeAbiParameters(
            [
                { name: "proof", type: "bytes32[]" },
                {
                    name: "flexCallData",
                    type: "tuple[]",
                    components: [
                        { name: "offset", type: "uint32" },
                        { name: "value", type: "bytes" }
                    ]
                }
            ],
            [merkleProof, flexCallData]
        )
        return concatHex([ecdsaSig, merkleRoot, encodedMerkleProof])
    }
    let flexCallData: FlexData[] = []
    let flexCallDataUserOpIndex = 0
    userOperations.map((userOp, index) => {
        if (userOp.callData?.includes("e917a962") && userOp.signature) {
            const dataOffset = slice(userOp.signature, 97)
            console.log({ dataOffset })
            const [_, __, _flexCallData] = decodeAbiParameters(
                [
                    { name: "dummyUserOpHash", type: "bytes32" },
                    { name: "proof", type: "bytes32[]" },
                    {
                        name: "flexCallData",
                        type: "tuple[]",
                        components: [
                            { name: "offset", type: "uint32" },
                            { name: "value", type: "bytes" }
                        ]
                    }
                ],
                dataOffset
            )
            flexCallData = [..._flexCallData]
            flexCallDataUserOpIndex = index
        }
    })

    const signedMultiUserOps = userOperations.map((userOp, index) => {
        return {
            ...userOp,
            signature: encodeMerkleDataWithSig(
                userOpHashes[index],
                index === flexCallDataUserOpIndex
                    ? flexCallData
                    : ([] as FlexData[])
            )
        }
    })

    return signedMultiUserOps as SignUserOperationsReturnType
}
