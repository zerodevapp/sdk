import type { BaseError, Chain, Client, Hash, Transport } from "viem"
import {
    type PrepareUserOperationParameters,
    type SendUserOperationParameters,
    type SmartAccount,
    type UserOperation,
    type UserOperationReceipt,
    formatUserOperationReceipt,
    formatUserOperationRequest,
    getUserOperationError,
    prepareUserOperation,
    waitForUserOperationReceipt
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import { AccountNotFoundError } from "../../errors/index.js"
import type { ZeroDevAccountClientRpcSchema } from "../../types/kernel.js"

/** JSON-RPC error code returned by `zd_sendUserOperationSync` when the bundler accepted the user operation but no receipt was available before the timeout. */
export const SEND_USER_OPERATION_SYNC_TIMEOUT_CODE = 4

export type SendUserOperationSyncParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = SendUserOperationParameters<account, accountOverride, calls> & {
    /** How long the bundler should wait for a receipt before returning a timeout error. Uses the bundler's default when omitted. */
    timeoutMs?: number | undefined
    /** On a bundler timeout, poll `eth_getUserOperationReceipt` for the accepted user operation instead of throwing. @default true */
    fallbackToPolling?: boolean | undefined
}

export type SendUserOperationSyncReturnType = UserOperationReceipt

function getSyncTimeoutUserOpHash(error: unknown): Hash | undefined {
    let current: unknown = error
    while (current && typeof current === "object") {
        const { code, data } = current as { code?: unknown; data?: unknown }
        if (
            code === SEND_USER_OPERATION_SYNC_TIMEOUT_CODE &&
            data &&
            typeof data === "object" &&
            typeof (data as { userOpHash?: unknown }).userOpHash === "string"
        ) {
            return (data as { userOpHash: Hash }).userOpHash
        }
        current = (current as { cause?: unknown }).cause
    }
    return undefined
}

/**
 * Prepares, signs, and sends a user operation with `zd_sendUserOperationSync`, which returns the receipt once the user operation is included.
 *
 * If the bundler times out (JSON-RPC code 4) the user operation was accepted and may still land; by default the action then polls `eth_getUserOperationReceipt` for it.
 *
 * @param client - Client to use
 * @param parameters - {@link SendUserOperationSyncParameters}
 * @returns The user operation receipt. {@link SendUserOperationSyncReturnType}
 *
 * @example
 * const receipt = await sendUserOperationSync(kernelClient, {
 *   calls: [{ to: "0x...", value: 0n, data: "0x" }],
 *   timeoutMs: 10_000
 * })
 */
export async function sendUserOperationSync<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account, ZeroDevAccountClientRpcSchema>,
    parameters: SendUserOperationSyncParameters<account, accountOverride, calls>
): Promise<SendUserOperationSyncReturnType> {
    const {
        timeoutMs,
        fallbackToPolling = true,
        ...args
    } = parameters as SendUserOperationSyncParameters
    const { account: account_ = client.account, entryPointAddress } = args

    if (!account_ && !args.sender)
        throw new AccountNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    const account = account_ ? parseAccount(account_) : undefined

    const request = account
        ? await getAction(
              client,
              prepareUserOperation,
              "prepareUserOperation"
          )(args as unknown as PrepareUserOperationParameters)
        : args

    const signature = (args.signature ||
        (await account?.signUserOperation?.(request as UserOperation))) as Hash

    const rpcParameters = formatUserOperationRequest({
        ...request,
        signature
    } as UserOperation)

    try {
        const receipt = await client.request(
            {
                method: "zd_sendUserOperationSync",
                params: [
                    rpcParameters,
                    // biome-ignore lint/style/noNonNullAssertion: mirrors viem's sendUserOperation
                    (entryPointAddress ?? account?.entryPoint?.address)!,
                    ...(timeoutMs ? [{ timeoutMs }] : [])
                ] as ZeroDevAccountClientRpcSchema[1]["Parameters"]
            },
            { retryCount: 0 }
        )
        return formatUserOperationReceipt(receipt)
    } catch (error) {
        const userOpHash = getSyncTimeoutUserOpHash(error)
        if (userOpHash && fallbackToPolling) {
            return getAction(
                client,
                waitForUserOperationReceipt,
                "waitForUserOperationReceipt"
            )({ hash: userOpHash })
        }
        if (userOpHash) throw error

        const calls = (args as { calls?: readonly unknown[] }).calls
        throw getUserOperationError(error as BaseError, {
            ...(request as UserOperation),
            ...(calls ? { calls } : {}),
            signature
        })
    }
}
