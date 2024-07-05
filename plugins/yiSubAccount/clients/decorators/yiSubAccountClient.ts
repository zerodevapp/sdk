import type {
    Middleware,
    SendTransactionWithPaymasterParameters,
    SendUserOperationParameters
} from "permissionless/actions/smartAccount"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Transport } from "viem"
import { sendUserOperation } from "../../actions/sendUserOperation.js"
import { sendTransaction } from "../../actions/sendTransaction.js"
import type { SmartAccount } from "permissionless/accounts/types.js"
import type { SmartAccountActions } from "permissionless"

export type YiSubAccountClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = Pick<
    SmartAccountActions<entryPoint, TChain, TSmartAccount>,
    "sendUserOperation" | "sendTransaction"
>

export function yiSubAccountClientActions<entryPoint extends EntryPoint>({
    middleware
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): YiSubAccountClientActions<entryPoint, TChain, TSmartAccount> => {
        return {
            sendTransaction: (args) =>
                sendTransaction<TChain, TSmartAccount, entryPoint>(client, {
                    ...args,
                    middleware
                } as SendTransactionWithPaymasterParameters<entryPoint, TChain, TSmartAccount>),
            sendUserOperation: (args) =>
                sendUserOperation<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >(client, {
                    ...args,
                    middleware
                } as SendUserOperationParameters<entryPoint, TSmartAccount>)
        }
    }
}
