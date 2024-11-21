import { MerkleTree } from "merkletreejs"
import { type Hex, concatHex, encodeAbiParameters, keccak256 } from "viem"

export const getDummyDestinationSignature = (numOfUserOps: number): Hex => {
    const dummyUserOpHash = `0x${"a".repeat(64)}`
    const leaves = Array(numOfUserOps).fill(dummyUserOpHash)

    const merkleTree = new MerkleTree(leaves, keccak256, {
        sortPairs: true
    })

    const merkleRoot = merkleTree.getHexRoot() as Hex
    const merkleProof = merkleTree.getHexProof(leaves[0]) as Hex[]

    const dummyEcdsaSig =
        "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

    const encodedMerkleProof = encodeAbiParameters(
        [
            { name: "dummyUserOpHash", type: "bytes32" },
            { name: "proof", type: "bytes32[]" }
        ],
        [leaves[0], merkleProof]
    )

    const finalDummySig = concatHex([
        dummyEcdsaSig,
        merkleRoot,
        encodedMerkleProof
    ])

    const dummyDestSig = `0x${"d33d".repeat(
        finalDummySig.length / 4
    )}`.substring(0, finalDummySig.length) as Hex
    console.log({ dummyDestSig, finalDummySig })
    console.log({ dummyDestSigLength: dummyDestSig.length })
    console.log({ finalDummySigLength: finalDummySig.length })

    if (finalDummySig.length !== dummyDestSig.length) {
        throw new Error("finalDummySig !== dummyDestSig")
    }

    return dummyDestSig
}
