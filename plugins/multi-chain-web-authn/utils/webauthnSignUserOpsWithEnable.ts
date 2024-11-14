import {
    type Action,
    type KernelSmartAccountImplementation,
    KernelV3AccountAbi,
    getEncodedPluginsData
} from "@zerodev/sdk"
import { MerkleTree } from "merkletreejs"
import {
    type Hex,
    concatHex,
    encodeAbiParameters,
    getAbiItem,
    hashMessage,
    hashTypedData,
    keccak256,
    toFunctionSelector,
    zeroAddress
} from "viem"
import type {
    EntryPointVersion,
    SmartAccount,
    UserOperation
} from "viem/account-abstraction"

type MultiChainUserOpConfigForEnable<
    entryPointVersion extends EntryPointVersion
> = {
    account: SmartAccount<KernelSmartAccountImplementation>
    userOp: UserOperation<entryPointVersion>
}

/**
 *
 * @dev Sign user operations with enable signatures for multi-chain validator
 * @returns Signed user operations
 */
export const webauthnSignUserOpsWithEnable = async <
    entryPointVersion extends EntryPointVersion
>({
    multiChainUserOpConfigsForEnable
}: {
    multiChainUserOpConfigsForEnable: MultiChainUserOpConfigForEnable<entryPointVersion>[]
}): Promise<UserOperation<entryPointVersion>[]> => {
    const pluginEnableTypedDatas = await Promise.all(
        multiChainUserOpConfigsForEnable.map(async (config) => {
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

    const toEthSignedMessageHash = hashMessage({ raw: merkleRoot })

    const passkeySig =
        await multiChainUserOpConfigsForEnable[0].account.kernelPluginManager.sudoValidator?.signMessage(
            {
                message: {
                    raw: toEthSignedMessageHash
                }
            }
        )

    if (!passkeySig) {
        throw new Error(
            "No passkeySig, check if the sudo validator is multi-chain validator"
        )
    }

    const enableSigs = multiChainUserOpConfigsForEnable.map((_, index) => {
        const merkleProof = merkleTree.getHexProof(leaves[index]) as Hex[]
        const encodedMerkleProof = encodeAbiParameters(
            [{ name: "proof", type: "bytes32[]" }],
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

    const userOpSignatures = await Promise.all(
        multiChainUserOpConfigsForEnable.map(async (config) => {
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
        multiChainUserOpConfigsForEnable.map(async (config, index) => {
            return await getEncodedPluginsData({
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

    return multiChainUserOpConfigsForEnable.map((config, index) => {
        return {
            ...config.userOp,
            signature: finalSignatures[index]
        }
    })
}
