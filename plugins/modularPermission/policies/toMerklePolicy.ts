import { MerkleTree } from "merkletreejs"
import {
    type Abi,
    type Hex,
    concatHex,
    encodeAbiParameters,
    keccak256,
    pad,
    toHex
} from "viem"
import { MERKLE_POLICY_CONTRACT, PolicyFlags } from "../constants.js"
import type { PermissionCore } from "../types.js"
import {
    findMatchingPermissions,
    getPermissionFromABI
} from "./merklePolicyUtils.js"
import type { MerklePolicyParams, Policy } from "./types.js"

export enum ParamOperator {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5
}

export enum Operation {
    Call = 0,
    DelegateCall = 1
}

export async function toMerklePolicy<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends string | undefined = string
>({
    policyAddress = MERKLE_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    permissions = [],
    type = "merkle"
}: MerklePolicyParams<TAbi, TFunctionName>): Promise<Policy> {
    const generatedPermissionParams = permissions?.map((perm) =>
        getPermissionFromABI({
            abi: perm.abi as Abi,
            functionName: perm.functionName as string,
            args: perm.args as []
        })
    )
    permissions =
        permissions?.map((perm, index) => ({
            ...perm,
            valueLimit: perm.valueLimit ?? 0n,
            sig:
                perm.sig ??
                generatedPermissionParams?.[index]?.sig ??
                pad("0x", { size: 4 }),
            rules:
                perm.rules ?? generatedPermissionParams?.[index]?.rules ?? [],
            operation: perm.operation ?? Operation.Call
        })) ?? []

    const encodedPermissionData = permissions.map((permission) =>
        encodePermissionData(permission)
    )

    if (encodedPermissionData.length && encodedPermissionData.length === 1)
        encodedPermissionData.push(encodedPermissionData[0])

    const merkleTree: MerkleTree = permissions.length
        ? new MerkleTree(encodedPermissionData, keccak256, {
              sortPairs: true,
              hashLeaves: true
          })
        : new MerkleTree([pad("0x00", { size: 32 })], keccak256, {
              hashLeaves: false,
              complete: true
          })

    const getEncodedPermissionProofData = (callData: Hex): Hex => {
        const matchingPermission = findMatchingPermissions(
            callData,
            permissions
        )
        if (
            !matchingPermission &&
            !(merkleTree.getHexRoot() === pad("0x00", { size: 32 }))
        ) {
            throw Error(
                "SessionKeyValidator: No matching permission found for the userOp"
            )
        }
        const encodedPermissionData =
            permissions && permissions.length !== 0 && matchingPermission
                ? encodePermissionData(matchingPermission)
                : "0x"
        let merkleProof: string[] | string[][] = []
        if (Array.isArray(matchingPermission)) {
            const encodedPerms = matchingPermission.map((permission) =>
                keccak256(encodePermissionData(permission))
            )
            merkleProof = encodedPerms.map((perm) =>
                merkleTree.getHexProof(perm)
            )
        } else if (matchingPermission) {
            merkleProof = merkleTree.getHexProof(
                keccak256(encodedPermissionData)
            )
        }
        return permissions && permissions.length !== 0 && matchingPermission
            ? encodePermissionData(matchingPermission, merkleProof)
            : "0x"
    }
    return {
        getPolicyData: () => {
            return pad(merkleTree.getHexRoot() as Hex, { size: 32 })
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        getSignaturePolicyData: (userOperation) => {
            const proofData = getEncodedPermissionProofData(
                userOperation.callData
            )
            return concatHex([
                policyAddress,
                pad(toHex(proofData.length / 2 - 1), { size: 32 }),
                proofData
            ])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag,
            permissions
        } as unknown as MerklePolicyParams<Abi | readonly unknown[], string>
    }
}

export const encodePermissionData = (
    permission: PermissionCore | PermissionCore[],
    merkleProof?: string[] | string[][]
): Hex => {
    const permissionParam = {
        components: [
            {
                name: "target",
                type: "address"
            },
            {
                name: "sig",
                type: "bytes4"
            },
            {
                name: "valueLimit",
                type: "uint256"
            },
            {
                components: [
                    {
                        name: "offset",
                        type: "uint256"
                    },
                    {
                        internalType: "enum ParamCondition",
                        name: "condition",
                        type: "uint8"
                    },
                    {
                        name: "param",
                        type: "bytes32"
                    }
                ],
                name: "rules",
                type: "tuple[]"
            },
            {
                internalType: "enum Operation",
                name: "operation",
                type: "uint8"
            }
        ],
        name: "permission",
        type: Array.isArray(permission) ? "tuple[]" : "tuple"
    }
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let params: any[]
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let values: any[]
    if (merkleProof) {
        params = [
            permissionParam,
            {
                name: "merkleProof",
                type: Array.isArray(merkleProof[0])
                    ? "bytes32[][]"
                    : "bytes32[]"
            }
        ]
        values = [permission, merkleProof]
    } else {
        params = [permissionParam]
        values = [permission]
    }
    return encodeAbiParameters(params, values)
}
