import { BaseError, RpcRequestError } from "viem"

// The server's own error message for a rejected RPC call. viem's rendered
// message also embeds the request body, which can match unrelated patterns
// (e.g. the word "signature"), so assertions must look at this instead.
export async function rpcErrorDetails(promise: Promise<unknown>) {
    try {
        await promise
    } catch (error) {
        if (error instanceof BaseError) {
            const rpc = error.walk((e) => e instanceof RpcRequestError)
            if (rpc instanceof RpcRequestError) return rpc.details
        }
        throw error
    }
    throw new Error("expected the call to be rejected, but it succeeded")
}
