import type { KernelSmartAccount } from "@zerodev/sdk"
import {
    AccountOrClientNotFoundError,
    type UserOperation,
    parseAccount
} from "permissionless"
import { sendUserOperation as sendUserOperationBundler } from "permissionless/actions"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type { SendUserOperationParameters } from "permissionless/actions/smartAccount"
import type { EntryPoint, GetEntryPointVersion } from "permissionless/types"
import {
    type Chain,
    type Client,
    type Hash,
    type Transport,
    concatHex,
    encodeAbiParameters,
    publicActions
} from "viem"
import type { Prettify } from "viem/chains"
import { getAction } from "viem/utils"
import { encodeSignatures } from "../utils.js"
import type { ApproveUserOperationReturnType } from "./approveUserOperation.js"

export type SendUserOperationWithApprovalsParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
> = Prettify<
    SendUserOperationParameters<entryPoint, TTransport, TChain, TAccount> & {
        approvals: ApproveUserOperationReturnType[]
    }
>

export async function sendUserOperationWithApprovals<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined =
        | KernelSmartAccount<entryPoint, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        SendUserOperationWithApprovalsParameters<
            entryPoint,
            TTransport,
            TChain,
            TAccount
        >
    >
): Promise<Hash> {
    const { account: account_ = client.account } = args
    client.chain
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    const { userOperation: _userOperation, approvals } = args
    const chainId = client.chain
        ? client.chain.id
        : await client.extend(publicActions).getChainId()

    const approveProof = approvals[0].merkleData.proofs[chainId]
    const approveMerkleRoot = approvals[0].merkleData.root

    const approveMerkleData = concatHex([
        approveMerkleRoot,
        encodeAbiParameters(
            [{ name: "merkleProof", type: "bytes32[]" }],
            [approveProof]
        )
    ])
    const signatures = approvals.map((approval) => approval.signature)

    const encodedSignatures = encodeSignatures(approveMerkleData, signatures)
    _userOperation.signature = encodedSignatures
    _userOperation.signature = await account.getDummySignature(
        _userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )
    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )(args)
    userOperation.signature = encodedSignatures

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    return sendUserOperationBundler(client, {
        userOperation: userOperation as UserOperation<
            GetEntryPointVersion<entryPoint>
        >,
        entryPoint: account.entryPoint
    })
}
