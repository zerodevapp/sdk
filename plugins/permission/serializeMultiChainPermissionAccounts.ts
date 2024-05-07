import type { KernelSmartAccount } from "@zerodev/sdk"
import MerkleTree from "merkletreejs"
import type { EntryPoint } from "permissionless/types"
import {
    type Hex,
    concatHex,
    encodeAbiParameters,
    hashTypedData,
    keccak256
} from "viem"
import type { PermissionPlugin } from "./types.js"
import {
    isPermissionValidatorPlugin,
    serializePermissionAccountParams
} from "./utils.js"

export type MultiChainPermissionAccountsParams<entryPoint extends EntryPoint> =
    {
        account: KernelSmartAccount<entryPoint>
        privateKey?: Hex
    }

export const serializeMultiChainPermissionAccounts = async <
    entryPoint extends EntryPoint
>(
    params: MultiChainPermissionAccountsParams<entryPoint>[]
): Promise<string[]> => {
    if (params.length === 0) return []

    const permissionParamsPerAccounts = params.map((param) => {
        if (!isPermissionValidatorPlugin(param.account.kernelPluginManager)) {
            throw new Error("Account plugin is not a permission validator")
        }
        return (
            param.account.kernelPluginManager as PermissionPlugin<entryPoint>
        ).getPluginSerializationParams()
    })

    const actions = params.map((param) =>
        param.account.kernelPluginManager.getAction()
    )

    const validityDataPerAccounts = params.map((param) =>
        param.account.kernelPluginManager.getValidityData()
    )

    const pluginEnableTypedDatas = await Promise.all(
        params.map(async (param) => {
            return param.account.kernelPluginManager.getPluginsEnableTypedData(
                param.account.address
            )
        })
    )

    // get enable signatures for multi-chain validator
    const enableSignatures = await Promise.all(
        params.map(async (param, index) => {
            const leaves = pluginEnableTypedDatas.map((typedData) => {
                return hashTypedData(typedData)
            })

            const merkleTree = new MerkleTree(leaves, keccak256, {
                sortPairs: true
            })

            const merkleRoot = merkleTree.getHexRoot() as Hex

            const ecdsaSig =
                await param.account.kernelPluginManager.sudoValidator?.signMessage(
                    {
                        message: {
                            raw: merkleRoot
                        }
                    }
                )

            if (!ecdsaSig) {
                throw new Error(
                    "No ecdsaSig, check if the sudo validator is multi-chain validator"
                )
            }

            const merkleProof = merkleTree.getHexProof(leaves[index]) as Hex[]
            const encodedMerkleProof = encodeAbiParameters(
                [{ name: "proof", type: "bytes32[]" }],
                [merkleProof]
            )
            return concatHex([ecdsaSig, merkleRoot, encodedMerkleProof])
        })
    )

    const accountParamsPerAccounts = await Promise.all(
        params.map(async (param) => {
            return {
                initCode: await param.account.generateInitCode(),
                accountAddress: param.account.address
            }
        })
    )

    const paramsToBeSerialized = params.map((param, index) => {
        return serializePermissionAccountParams({
            permissionParams: permissionParamsPerAccounts[index],
            action: actions[index],
            validityData: validityDataPerAccounts[index],
            accountParams: accountParamsPerAccounts[index],
            enableSignature: enableSignatures[index],
            privateKey: param.privateKey
        })
    })

    return paramsToBeSerialized
}
