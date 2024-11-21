import type { EntryPointType } from "@zerodev/sdk/types"
import { MerkleTree } from "merkletreejs"
import { type Hex, concatHex, encodeAbiParameters, keccak256 } from "viem"
import {
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"

export const ecdsaGetMultiUserOpDummySignature = (
    userOperation: UserOperation<"0.7">,
    numOfUserOps: number,
    entryPoint: EntryPointType<"0.7">,
    chainId: number
): Hex => {
    console.log({ userOperation })
    const userOpHash = getUserOperationHash({
        userOperation,
        entryPointAddress: entryPoint.address,
        entryPointVersion: entryPoint.version,
        chainId
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
    if (!userOperation.callData.includes("e917a962")) {
        return finalDummySig
    }

    const dummyDestSig = `0x${"d33d".repeat(
        finalDummySig.length / 4
    )}`.substring(0, finalDummySig.length) as Hex

    const encodedMerkleProofWithDestSig = encodeAbiParameters(
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
        [
            userOpHash,
            merkleProof,
            [
                {
                    value: dummyDestSig,
                    offset: userOperation.callData.indexOf("d33d") / 2 - 1
                }
            ]
        ]
    )

    const finalDummySigWithDestSig = concatHex([
        dummyEcdsaSig,
        merkleRoot,
        encodedMerkleProofWithDestSig
    ])

    return finalDummySigWithDestSig
}
