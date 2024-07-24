import { encodeAbiParameters, concatHex, keccak256, stringToHex } from "viem"
import type { Caveat, Delegation } from "../types"

export const getDelegationTupleType = (isArray = false) => {
    return {
        name: "delegation",
        type: isArray ? "tuple[]" : "tuple",
        components: [
            { name: "delegate", type: "address" },
            { name: "delegator", type: "address" },
            { name: "authority", type: "bytes32" },
            {
                name: "caveats",
                type: "tuple[]",
                components: [
                    { name: "enforcer", type: "address" },
                    { name: "terms", type: "bytes" },
                    { name: "args", type: "bytes" }
                ]
            },
            { name: "salt", type: "uint256" },
            { name: "signature", type: "bytes" }
        ]
    }
}

export const getCaveatPackedHash = (caveat: Caveat) => {
    const encoded = encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "bytes32" }],
        [
            keccak256(stringToHex("Caveat(address enforcer,bytes terms)")),
            caveat.enforcer,
            keccak256(caveat.terms)
        ]
    )
    const hash = keccak256(encoded)
    return hash
}

export const getCaveatsPackedHash = (caveats: Caveat[]) => {
    const caveatsPacked = caveats.map(getCaveatPackedHash)
    const hash = keccak256(concatHex([...caveatsPacked]))
    return hash
}

export const toDelegationHash = (delegation: Delegation) => {
    const caveatsPacked = getCaveatsPackedHash(delegation.caveats)
    return keccak256(
        encodeAbiParameters(
            [
                { type: "bytes32" },
                { type: "address", name: "delegate" },
                { type: "address", name: "delegator" },
                { type: "bytes32", name: "authority" },
                {
                    name: "caveats",
                    type: "bytes32"
                },
                { type: "uint256", name: "salt" }
            ],
            [
                keccak256(
                    stringToHex(
                        "Delegation(address delegate,address delegator,bytes32 authority,Caveat[] caveats,uint256 salt)Caveat(address enforcer,bytes terms)"
                    )
                ),
                delegation.delegate,
                delegation.delegator,
                delegation.authority,
                caveatsPacked,
                delegation.salt
            ]
        )
    )
}
