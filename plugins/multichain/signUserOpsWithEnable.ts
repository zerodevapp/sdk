import {
    type Action,
    type KernelSmartAccount,
    KernelV3AccountAbi,
    getEncodedPluginsDataWithoutValidator
} from "@zerodev/sdk"
import MerkleTree from "merkletreejs"
import type { UserOperation } from "permissionless"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Hex,
    concatHex,
    encodeAbiParameters,
    getAbiItem,
    hashTypedData,
    keccak256,
    toFunctionSelector,
    zeroAddress
} from "viem"

export type MultiChainUserOpConfigForEnable<entryPoint extends EntryPoint> = {
    account: KernelSmartAccount<EntryPoint>
    userOp: UserOperation<GetEntryPointVersion<entryPoint>>
}

/**
 *
 * @dev Sign user operations with enable signatures for multi-chain validator
 * @returns Signed user operations
 */
export const signUserOpsWithEnable = async ({
    multiChainUserOpConfigs
}: {
    multiChainUserOpConfigs: MultiChainUserOpConfigForEnable<EntryPoint>[]
}): Promise<UserOperation<GetEntryPointVersion<EntryPoint>>[]> => {
    const pluginEnableTypedDatas = await Promise.all(
        multiChainUserOpConfigs.map(async (config) => {
            return config.account.kernelPluginManager.getPluginsEnableTypedData(
                config.account.address
            )
        })
    )

    const leaves = pluginEnableTypedDatas.map((typedData) => {
        return hashTypedData(typedData)
    })

    const merkleTree = new MerkleTree(leaves, keccak256, {
        sortPairs: true
    })

    const merkleRoot = merkleTree.getHexRoot() as Hex

    const ecdsaSig =
        await multiChainUserOpConfigs[0].account.kernelPluginManager.sudoValidator?.signMessage(
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

    const enableSigs = multiChainUserOpConfigs.map((_, index) => {
        const merkleProof = merkleTree.getHexProof(leaves[index]) as Hex[]
        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "proof", type: "bytes32[]" }],
            [merkleProof]
        )
        return concatHex([ecdsaSig, merkleRoot, encodedMerkleProof])
    })

    const userOpSignatures = await Promise.all(
        multiChainUserOpConfigs.map(async (config) => {
            return config.account.kernelPluginManager.signUserOperationWithActiveValidator(
                config.userOp
            )
        })
    )

    const action: Action = {
        selector: toFunctionSelector(
            getAbiItem({ abi: KernelV3AccountAbi, name: "execute" })
        ),
        address: zeroAddress
    }

    const finalSignatures = await Promise.all(
        multiChainUserOpConfigs.map(async (config, index) => {
            return await getEncodedPluginsDataWithoutValidator({
                enableSignature: enableSigs[index],
                userOpSignature: userOpSignatures[index],
                action,
                enableData:
                    await config.account.kernelPluginManager.getEnableData(
                        config.account.address
                    )
            })
        })
    )

    return multiChainUserOpConfigs.map((config, index) => {
        return {
            ...config.userOp,
            signature: finalSignatures[index]
        }
    })
}
