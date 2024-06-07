import type { KernelSmartAccount } from "@zerodev/sdk"
import { MerkleTree } from "merkletreejs"
import type { Middleware } from "permissionless/actions/smartAccount"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint,
    GetAccountParameter,
    PartialBy,
    Prettify,
    UserOperation
} from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import {
    type Chain,
    type Client,
    type Hex,
    type Transport,
    publicActions
} from "viem"
import {
    encodeAbiParameters,
    hashTypedData,
    keccak256,
    parseAbiParameters
} from "viem/utils"
import { getValidatorAddress } from "../toMultiChainWeightedValidatorPlugin.js"

export type ApproveUserOperationParameters<
    entryPoint extends EntryPoint,
    TAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
> = {
    multiChainAccounts: KernelSmartAccount<entryPoint>[]
    userOperation: entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? PartialBy<
              UserOperation<"v0.6">,
              | "sender"
              | "nonce"
              | "initCode"
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "maxFeePerGas"
              | "maxPriorityFeePerGas"
              | "paymasterAndData"
              | "signature"
          >
        : PartialBy<
              UserOperation<"v0.7">,
              | "sender"
              | "nonce"
              | "factory"
              | "factoryData"
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "maxFeePerGas"
              | "maxPriorityFeePerGas"
              | "paymaster"
              | "paymasterVerificationGasLimit"
              | "paymasterPostOpGasLimit"
              | "paymasterData"
              | "signature"
          >
} & GetAccountParameter<entryPoint, TAccount> &
    Middleware<entryPoint>

export type ApproveUserOperationReturnType = {
    signature: Hex
    merkleData: {
        proofs: { [id: number]: Hex[] }
        root: Hex
    }
}

export async function approveUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<ApproveUserOperationParameters<entryPoint, TAccount>>
): Promise<ApproveUserOperationReturnType> {
    const {
        account: account_ = client.account,
        userOperation,
        multiChainAccounts
    } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>
    const validatorAddress = getValidatorAddress(account.entryPoint)

    const fetchCallDataAndNonceHash = async (
        account: KernelSmartAccount<entryPoint>
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
