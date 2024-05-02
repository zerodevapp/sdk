import { type SendUserOperationParameters, deepHexlify } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type { BundlerRpcSchema } from "permissionless/types/bundler"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import type { UserOperationWithBigIntAsHex } from "permissionless/types/userOperation"
import type { Chain, Client, Hash, Transport } from "viem"

export async function sendSignedUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount, BundlerRpcSchema<entryPoint>>,
    args: SendUserOperationParameters<entryPoint>
): Promise<Hash> {
    const { userOperation, entryPoint } = args

    // send user operation directly without signing
    const userOperationHash = await client.request({
        method: "eth_sendUserOperation",
        params: [
            deepHexlify(userOperation) as UserOperationWithBigIntAsHex<
                GetEntryPointVersion<entryPoint>
            >,
            entryPoint
        ]
    })

    return userOperationHash
}
