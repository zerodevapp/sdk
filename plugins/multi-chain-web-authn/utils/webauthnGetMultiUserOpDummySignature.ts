import { MerkleTree } from "merkletreejs"
import {
    type Address,
    type Hex,
    concatHex,
    encodeAbiParameters,
    keccak256
} from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"

export const webauthnGetMultiUserOpDummySignature = <
    entryPointVersion extends EntryPointVersion
>(
    userOperation: UserOperation<entryPointVersion>,
    numOfUserOps: number,
    entryPoint: { address: Address; version: entryPointVersion },
    chainId: number
): Hex => {
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

    const dummyWebAuthnSig = encodeAbiParameters(
        [
            { name: "authenticatorData", type: "bytes" },
            { name: "clientDataJSON", type: "string" },
            { name: "responseTypeLocation", type: "uint256" },
            { name: "r", type: "uint256" },
            { name: "s", type: "uint256" },
            { name: "usePrecompiled", type: "bool" }
        ],
        [
            "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000",
            '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3000","crossOrigin":false}',
            1n,
            44941127272049826721201904734628716258498742255959991581049806490182030242267n,
            9910254599581058084911561569808925251374718953855182016200087235935345969636n,
            false
        ]
    )

    const encodedMerkleProof = encodeAbiParameters(
        [
            { name: "dummyUserOpHash", type: "bytes32" },
            { name: "proof", type: "bytes32[]" }
        ],
        [userOpHash, merkleProof]
    )

    const merkleData = concatHex([merkleRoot, encodedMerkleProof])

    const finalDummySig = encodeAbiParameters(
        [
            { name: "merkleData", type: "bytes" },
            { name: "signature", type: "bytes" }
        ],
        [merkleData, dummyWebAuthnSig]
    )

    return finalDummySig
}
