import { AccountOrClientNotFoundError, parseAccount } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type {
    EntryPoint,
    GetAccountParameter,
    Prettify
} from "permissionless/types"
import type { Address, Chain, Client, Hash, Transport } from "viem"
import { decodeAbiParameters } from "viem"
import { getChainId } from "viem/actions"
import { DMVersionToAddressMap } from "../constants.js"
import type { Delegation } from "../types.js"

export type SignDelegationParameters<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
> = Prettify<
    {
        delegation: Delegation
        delegationManagerAddress?: Address
    } & GetAccountParameter<entryPoint, TTransport, TChain, TAccount>
>

export async function signDelegation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<entryPoint, string, TTransport, TChain>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: SignDelegationParameters<entryPoint, TTransport, TChain, TAccount>
): Promise<Hash> {
    const {
        account: account_ = client.account,
        delegation,
        delegationManagerAddress = DMVersionToAddressMap["1.0.0"]
            .delegationManagerAddress
    } = args

    if (!account_) {
        throw new AccountOrClientNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    }

    const account = parseAccount(account_) as SmartAccount<
        entryPoint,
        string,
        TTransport,
        TChain
    >

    const chainId = client.chain ? client.chain.id : await getChainId(client)

    if (account.type !== "local") {
        throw new Error("RPC account type not supported")
    }

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
