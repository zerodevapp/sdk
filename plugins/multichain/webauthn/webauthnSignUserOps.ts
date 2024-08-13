import type { KernelSmartAccount } from "@zerodev/sdk"
import { MerkleTree } from "merkletreejs"
import { type UserOperation, getUserOperationHash } from "permissionless"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Hex,
    concatHex,
    encodeAbiParameters,
    hashMessage,
    keccak256
} from "viem"

type MultiChainUserOperation<entryPoint extends EntryPoint> = {
    userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    chainId: number
}

export async function webauthnSignUserOps<entryPoint extends EntryPoint>({
    account,
    multiUserOps,
    entryPoint: entryPointAddress
}: {
    account: KernelSmartAccount<EntryPoint>
    multiUserOps: MultiChainUserOperation<entryPoint>[]
    entryPoint: entryPoint
}): Promise<UserOperation<GetEntryPointVersion<entryPoint>>[]> {
    const userOpHashes = multiUserOps.map((multiUserOp, _index) => {
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

    const toEthSignedMessageHash = hashMessage({ raw: merkleRoot })

    const passkeySig = await account.kernelPluginManager.signMessage({
        message: {
            // concat dummy 32 bytes to specify that the message is from webauthnSignUserOps
            raw: concatHex([
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                toEthSignedMessageHash
            ])
        }
    })

    const merkleProofs = userOpHashes.map((hash) => {
        return merkleTree.getHexProof(hash) as Hex[]
    })

    const multiChainSigs = multiUserOps.map((_, index) => {
        const merkleProof = merkleProofs[index]
        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "merkleData", type: "bytes32[]" }],
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
    })

    const signedMultiUserOps = multiUserOps.map((multiUserOp, index) => {
        return {
            ...multiUserOp.userOperation,
            signature: multiChainSigs[index]
        }
    })

    return signedMultiUserOps
}
