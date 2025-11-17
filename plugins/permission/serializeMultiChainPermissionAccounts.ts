import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import { MerkleTree } from "merkletreejs"
import {
    type Hex,
    concatHex,
    decodeAbiParameters,
    encodeAbiParameters,
    hashMessage,
    hashTypedData,
    keccak256
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import type { PermissionPlugin } from "./types.js"
import {
    isPermissionValidatorPlugin,
    serializePermissionAccountParams
} from "./utils.js"

export type MultiChainPermissionAccountsParams = {
    account: SmartAccount<KernelSmartAccountImplementation>
    privateKey?: Hex
    permissionPlugin?: PermissionPlugin
    isExternalPermissionPlugin?: boolean
}

export const serializeMultiChainPermissionAccounts = async (
    params: MultiChainPermissionAccountsParams[]
): Promise<string[]> => {
    if (params.length === 0) return []

    let isPreInstalled = false
    const permissionParamsPerAccounts = params.map((param) => {
        if (
            isPermissionValidatorPlugin(param.account.kernelPluginManager) &&
            !param.isExternalPermissionPlugin
        ) {
            return (
                param.account.kernelPluginManager as PermissionPlugin
            ).getPluginSerializationParams()
        } else if (param.permissionPlugin) {
            isPreInstalled = !param.isExternalPermissionPlugin
            return param.permissionPlugin.getPluginSerializationParams()
        } else {
            throw new Error("Account plugin is not a permission validator")
        }
    })

    const actions = params.map((param) =>
        param.account.kernelPluginManager.getAction()
    )

    const validityDataPerAccounts = params.map((param) =>
        param.account.kernelPluginManager.getValidityData()
    )

    let leaves: Hex[] = []
    let merkleTree: MerkleTree = new MerkleTree(leaves)

    if (!isPreInstalled) {
        const pluginEnableTypedDatas = await Promise.all(
            params.map(async (param) => {
                return param.account.kernelPluginManager.getPluginsEnableTypedData(
                    param.account.address,
                    param.isExternalPermissionPlugin
                        ? param.permissionPlugin
                        : undefined // override permission plugin if externalPlugin
                )
            })
        )

        // build merkle tree for enable signatures
        leaves = pluginEnableTypedDatas.map((typedData) => {
            return hashTypedData(typedData)
        })

        merkleTree = new MerkleTree(leaves, keccak256, {
            sortPairs: true
        })
    }
    const merkleRoot = merkleTree.getHexRoot() as Hex

    const toEthSignedMessageHash = hashMessage({ raw: merkleRoot })

    let signature: Hex = "0x"
    if (
        params[0].account.kernelPluginManager.sudoValidator?.source ===
            "MultiChainECDSAValidator" &&
        !isPreInstalled
    ) {
        signature =
            await params[0].account.kernelPluginManager.sudoValidator?.signMessage(
                {
                    message: {
                        raw: merkleRoot
                    }
                }
            )
    }
    if (
        params[0].account.kernelPluginManager.sudoValidator?.source ===
            "MultiChainWebAuthnValidator" &&
        !isPreInstalled
    ) {
        const encodedSignature =
            await params[0].account.kernelPluginManager.sudoValidator?.signMessage(
                {
                    message: {
                        raw: toEthSignedMessageHash
                    }
                }
            )
        signature = decodeSignature(encodedSignature)
    }

    // get enable signatures for multi-chain validator
    const enableSignatures = await Promise.all(
        params.map(async (param, index) => {
            if (isPreInstalled) return undefined

            if (!param.account.kernelPluginManager.sudoValidator) {
                throw new Error(
                    "No sudo validator found, check if sudo validator is multi-chain validator"
                )
            }
            const merkleProof = merkleTree.getHexProof(leaves[index]) as Hex[]
            const encodedMerkleProof = encodeAbiParameters(
                [{ name: "proof", type: "bytes32[]" }],
                [merkleProof]
            )
            if (
                param.account.kernelPluginManager.sudoValidator.source ===
                "MultiChainECDSAValidator"
            ) {
                return concatHex([signature, merkleRoot, encodedMerkleProof])
            }
            if (
                param.account.kernelPluginManager.sudoValidator.source ===
                "MultiChainWebAuthnValidator"
            ) {
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
                    [merkleData, signature]
                )
            }
            throw new Error("Unknown multi-chain validator")
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

export function decodeSignature(signature: Hex) {
    const [_, passkeySig] = decodeAbiParameters(
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
        signature
    )
    return passkeySig
}
