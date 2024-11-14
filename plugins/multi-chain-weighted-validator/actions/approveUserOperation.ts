import type { KernelSmartAccountImplementation } from "@zerodev/sdk"
import { AccountNotFoundError } from "@zerodev/sdk"
import { MerkleTree } from "merkletreejs"
import {
    type Chain,
    type Client,
    type Hex,
    type RequiredBy,
    type Transport,
    publicActions
} from "viem"
import type {
    GetSmartAccountParameter,
    SmartAccount,
    UserOperation
} from "viem/account-abstraction"
import {
    encodeAbiParameters,
    hashTypedData,
    keccak256,
    parseAbiParameters,
    parseAccount
} from "viem/utils"
import { getValidatorAddress } from "../toMultiChainWeightedValidatorPlugin.js"

export type ApproveUserOperationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined
> = {
    multiChainAccounts: SmartAccount<KernelSmartAccountImplementation>[]
    userOperation: RequiredBy<Partial<UserOperation>, "callData">
} & GetSmartAccountParameter<account, accountOverride>

export type ApproveUserOperationReturnType = {
    signature: Hex
    merkleData: {
        proofs: { [id: number]: Hex[] }
        root: Hex
    }
}

export async function approveUserOperation<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined
>(
    client: Client<Transport, chain, account>,
    args: ApproveUserOperationParameters<account, accountOverride>
): Promise<ApproveUserOperationReturnType> {
    const {
        account: account_ = client.account,
        userOperation,
        multiChainAccounts
    } = args
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>
    const validatorAddress = getValidatorAddress(
        account.entryPoint,
        account.kernelVersion
    )

    const fetchCallDataAndNonceHash = async (
        account: SmartAccount
    ): Promise<Hex> => {
        return keccak256(
            encodeAbiParameters(parseAbiParameters("address, bytes, uint256"), [
                userOperation.sender || account.address,
                userOperation.callData,
                userOperation.nonce || (await account.getNonce())
            ])
        )
    }

    const callDataAndNonceHashes = await Promise.all(
        multiChainAccounts.map((account) => fetchCallDataAndNonceHash(account))
    )
    const chainIds = await Promise.all(
        multiChainAccounts.map(
            (account) =>
                account.client.chain?.id ??
                account.client.extend(publicActions).getChainId()
        )
    )

    const callDataAndNonceTypedHashes = chainIds.map((chainId, index) =>
        hashTypedData({
            domain: {
                name: "MultiChainWeightedValidator",
                version: "0.0.1",
                chainId,
                verifyingContract: validatorAddress
            },
            types: {
                Approve: [{ name: "callDataAndNonceHash", type: "bytes32" }]
            },
            primaryType: "Approve",
            message: {
                callDataAndNonceHash: callDataAndNonceHashes[index]
            }
        })
    )
    const merkleTree = new MerkleTree(callDataAndNonceTypedHashes, keccak256, {
        sortPairs: true
    })

    const merkleRoot = merkleTree.getHexRoot() as Hex

    const signature = await account.kernelPluginManager.signMessage({
        message: { raw: merkleRoot }
    })

    const proofs: ApproveUserOperationReturnType["merkleData"]["proofs"] = {}

    callDataAndNonceTypedHashes.forEach((hash, index) => {
        proofs[chainIds[index]] = merkleTree.getHexProof(hash) as Hex[]
    })

    return {
        signature,
        merkleData: {
            proofs,
            root: merkleRoot
        }
    }
}
