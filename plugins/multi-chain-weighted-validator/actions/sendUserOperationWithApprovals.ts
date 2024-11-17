import { AccountNotFoundError } from "@zerodev/sdk"
import {
    type Chain,
    type Client,
    type Hash,
    type Transport,
    concatHex,
    encodeAbiParameters,
    publicActions
} from "viem"
import {
    type PrepareUserOperationParameters,
    type SendUserOperationParameters,
    type SmartAccount,
    type UserOperation,
    prepareUserOperation,
    sendUserOperation
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import { encodeSignatures } from "../utils.js"
import type { ApproveUserOperationReturnType } from "./approveUserOperation.js"

export type SendUserOperationWithApprovalsParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = SendUserOperationParameters<account, accountOverride, calls> & {
    approvals: ApproveUserOperationReturnType[]
}

export async function sendUserOperationWithApprovals<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: SendUserOperationWithApprovalsParameters<
        account,
        accountOverride,
        calls
    >
): Promise<Hash> {
    const { account: account_ = client.account, approvals } = args
    client.chain
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(account_) as SmartAccount

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
    args.signature = encodedSignatures
    args.signature = await account.getStubSignature(args as UserOperation)
    const userOperation_ = await getAction(
        client,
        prepareUserOperation,
        "prepareUserOperation"
    )(args as PrepareUserOperationParameters)
    userOperation_.signature = encodedSignatures

    userOperation_.signature = await account.signUserOperation(
        userOperation_ as UserOperation
    )

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...args
    } as SendUserOperationParameters)
}
