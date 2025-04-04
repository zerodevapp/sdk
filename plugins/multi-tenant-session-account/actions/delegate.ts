import { AccountNotFoundError } from "@zerodev/sdk"
import { sendTransaction } from "@zerodev/sdk/actions"
import type {
    Address,
    Chain,
    Client,
    Hash,
    Prettify,
    SendTransactionParameters,
    Transport
} from "viem"
import { encodeFunctionData } from "viem"
import type {
    SendUserOperationParameters,
    SmartAccount
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import { DelegationManagerAbi } from "../abi/DelegationManagerAbi.js"
import { DMVersionToAddressMap, ROOT_AUTHORITY } from "../constants.js"
import type { Delegation } from "../types.js"

export type SendDelegateUserOperationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    chain extends Chain | undefined = Chain | undefined,
    chainOverride extends Chain | undefined = Chain | undefined
> = Prettify<
    Partial<SendTransactionParameters<chain, account, chainOverride>> & {
        delegation?: Delegation
        sessionKeyAddress: Delegation["delegate"]
        caveats: Delegation["caveats"]
        delegationManagerAddress?: Address
    }
>

export async function delegate<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined
>(
    client: Client<Transport, chain, account>,
    args: SendDelegateUserOperationParameters
): Promise<Hash> {
    const {
        account: account_ = client.account,
        delegation,
        caveats,
        sessionKeyAddress,
        delegationManagerAddress = DMVersionToAddressMap["1.0.0"]
            .delegationManagerAddress
    } = args

    if (!account_) {
        throw new AccountNotFoundError()
    }

    const account = parseAccount(account_) as SmartAccount

    return await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        ...args,
        calls: [
            {
                to: delegationManagerAddress,
                data: encodeFunctionData({
                    abi: DelegationManagerAbi,
                    functionName: "delegate",
                    args: [
                        delegation ?? {
                            delegate: sessionKeyAddress,
                            caveats,
                            authority: ROOT_AUTHORITY,
                            delegator: account.address,
                            salt: 0n,
                            signature: "0x"
                        }
                    ]
                }),
                value: 0n
            }
        ]
    } as SendTransactionParameters | SendUserOperationParameters)
}
