import type { SmartAccountActions } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type {
    Middleware,
    SendTransactionWithPaymasterParameters,
    SendUserOperationParameters
} from "permissionless/actions/smartAccount"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Transport } from "viem"
import { sendTransaction } from "../../actions/sendTransaction.js"
import { sendUserOperation } from "../../actions/sendUserOperation.js"

export type YiSubAccountClientActions<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
> = Pick<
    SmartAccountActions<entryPoint, TTransport, TChain, TSmartAccount>,
    "sendUserOperation" | "sendTransaction"
>

export function yiSubAccountClientActions<entryPoint extends EntryPoint>({
    middleware
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends
            | SmartAccount<entryPoint, string, TTransport, TChain>
            | undefined =
            | SmartAccount<entryPoint, string, TTransport, TChain>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): YiSubAccountClientActions<
        entryPoint,
        TTransport,
        TChain,
        TSmartAccount
    > => {
        return {
            sendTransaction: (args) =>
                sendTransaction<entryPoint, TTransport, TChain, TSmartAccount>(
                    client,
                    {
                        ...args,
                        middleware
                    } as SendTransactionWithPaymasterParameters<
                        entryPoint,
                        TTransport,
                        TChain,
                        TSmartAccount
                    >
                ),
            sendUserOperation: (args) =>
                sendUserOperation<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >(client, {
                    ...args,
                    middleware
                } as SendUserOperationParameters<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >)
        }
    }
}
