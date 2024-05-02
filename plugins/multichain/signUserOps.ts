import type { KernelSmartAccount } from "@zerodev/sdk"
import MerkleTree from "merkletreejs"
import { type UserOperation, getUserOperationHash } from "permissionless"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import { type Hex, concatHex, encodeAbiParameters, keccak256 } from "viem"

export type MultiChainUserOperation<entryPoint extends EntryPoint> = {
    userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    chainId: number
}

export async function signUserOps<entryPoint extends EntryPoint>({
    account,
    multiUserOps,
    entryPoint: entryPointAddress
}: {
    account: KernelSmartAccount<EntryPoint>
    multiUserOps: MultiChainUserOperation<entryPoint>[]
    entryPoint: entryPoint
}): Promise<UserOperation<GetEntryPointVersion<entryPoint>>[]> {
    const userOpHashes = multiUserOps.map((multiUserOp, index) => {
        return getUserOperationHash({
            userOperation: {
                ...multiUserOp.userOperation,
                signature: "0x"
            },
            entryPoint: entryPointAddress,
            chainId: multiUserOp.chainId
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

    const merkleProofs = userOpHashes.map((hash) => {
        return merkleTree.getHexProof(hash) as Hex[]
    })

    const multiChainSigs = multiUserOps.map((_, index) => {
        const merkleProof = merkleProofs[index]
        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "proof", type: "bytes32[]" }],
            [merkleProof]
        )
        return concatHex([ecdsaSig, merkleRoot, encodedMerkleProof])
    })

    const signedMultiUserOps = multiUserOps.map((multiUserOp, index) => {
        return {
            ...multiUserOp.userOperation,
            signature: multiChainSigs[index]
        }
    })

    return signedMultiUserOps
}
