import type {
    Account,
    Chain,
    EIP1193Provider,
    LocalAccount,
    OneOf,
    Transport,
    WalletClient
} from "viem"
import type { SmartAccount } from "viem/account-abstraction"

export type Signer = OneOf<
    | EIP1193Provider
    | WalletClient<Transport, Chain | undefined, Account>
    | LocalAccount
    | SmartAccount
>
