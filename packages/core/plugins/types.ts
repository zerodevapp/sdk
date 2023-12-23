import {
    Account,
    Address,
    Chain,
    Client,
    Hex,
    LocalAccount,
    Transport
} from "viem"
import { type UserOperation } from "permissionless"

export type KernelPlugin<
    Name extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
    signer: Account
    client: Client<transport, chain>
    entryPoint: Address
    getNonceKey: () => Promise<bigint>
    getDummySignature(): Promise<Hex>
    signUserOperation: (UserOperation: UserOperation) => Promise<Hex>
    getEnableData(): Promise<Hex>
}
