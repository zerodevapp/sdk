import type { Address, Chain, Client, Hash, Transport } from "viem"
import { decodeAbiParameters } from "viem"
import { getChainId } from "viem/actions"
import { DMVersionToAddressMap } from "../constants.js"
import type { Delegation } from "../types.js"
import type {
    GetSmartAccountParameter,
    SmartAccount
} from "viem/account-abstraction"
import { AccountNotFoundError } from "@zerodev/sdk"
import { parseAccount } from "viem/accounts"
import type { SessionAccountImplementation } from "../account/createSessionAccount.js"

export type SignDelegationParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined
> = {
    delegation: Delegation
    delegationManagerAddress?: Address
} & GetSmartAccountParameter<account, accountOverride>

export async function signDelegation<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined
>(
    client: Client<Transport, chain, account>,
    args: SignDelegationParameters<account, accountOverride>
): Promise<Hash> {
    const {
        account: account_ = client.account,
        delegation,
        delegationManagerAddress = DMVersionToAddressMap["1.0.0"]
            .delegationManagerAddress
    } = args

    if (!account_) {
        throw new AccountNotFoundError()
    }

    const account = parseAccount(
        account_
    ) as SmartAccount<SessionAccountImplementation>

    const chainId = client.chain ? client.chain.id : await getChainId(client)

    const signature = await account.signTypedData({
        domain: {
            chainId,
            name: "DelegationManager",
            verifyingContract: delegationManagerAddress,
            version: "1"
        },
        types: {
            Delegation: [
                {
                    name: "delegate",
                    type: "address"
                },
                {
                    name: "delegator",
                    type: "address"
                },
                {
                    name: "authority",
                    type: "bytes32"
                },
                {
                    name: "caveats",
                    type: "Caveat[]"
                },
                {
                    name: "salt",
                    type: "uint256"
                }
            ],
            Caveat: [
                { name: "enforcer", type: "address" },
                { name: "terms", type: "bytes" }
            ]
        },
        primaryType: "Delegation",
        message: {
            ...delegation
        }
    })
    if (signature.length > 174) {
        try {
            const [, , decodedSignature] = decodeAbiParameters(
                [
                    {
                        type: "address",
                        name: "create2Factory"
                    },
                    {
                        type: "bytes",
                        name: "factoryCalldata"
                    },
                    {
                        type: "bytes",
                        name: "originalERC1271Signature"
                    }
                ],
                signature
            )
            return decodedSignature
        } catch (error) {
            return signature
        }
    }
    return signature
}
