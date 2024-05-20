import type { KernelSmartAccount } from "@zerodev/sdk"
import type { SmartAccount } from "permissionless/accounts/types"
import type { Middleware } from "permissionless/actions/smartAccount"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint,
    GetAccountParameter,
    PartialBy,
    Prettify,
    UserOperation
} from "permissionless/types"
import {
    AccountOrClientNotFoundError,
    parseAccount
} from "permissionless/utils"
import type { Chain, Client, Hex, Transport } from "viem"
import { encodeAbiParameters, keccak256, parseAbiParameters } from "viem/utils"
import { getValidatorAddress } from "../toWeightedECDSAValidatorPlugin.js"

export type ApproveUserOperationParameters<
    entryPoint extends EntryPoint,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = {
    userOperation: entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
        ? PartialBy<
              UserOperation<"v0.6">,
              | "sender"
              | "nonce"
              | "initCode"
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "maxFeePerGas"
              | "maxPriorityFeePerGas"
              | "paymasterAndData"
              | "signature"
          >
        : PartialBy<
              UserOperation<"v0.7">,
              | "sender"
              | "nonce"
              | "factory"
              | "factoryData"
              | "callGasLimit"
              | "verificationGasLimit"
              | "preVerificationGas"
              | "maxFeePerGas"
              | "maxPriorityFeePerGas"
              | "paymaster"
              | "paymasterVerificationGasLimit"
              | "paymasterPostOpGasLimit"
              | "paymasterData"
              | "signature"
          >
} & GetAccountParameter<entryPoint, TAccount> &
    Middleware<entryPoint>

export async function approveUserOperation<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<ApproveUserOperationParameters<entryPoint, TAccount>>
): Promise<Hex> {
    const { account: account_ = client.account, userOperation } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>
    const validatorAddress = getValidatorAddress(account.entryPoint)

    const callDataAndNonceHash = keccak256(
        encodeAbiParameters(parseAbiParameters("address, bytes, uint256"), [
            userOperation.sender || account.address,
            userOperation.callData,
            userOperation.nonce || (await account.getNonce())
        ])
    )

    const signature = await account.kernelPluginManager.signTypedData({
        domain: {
            name: "WeightedValidator",
            version: "0.0.1",
            chainId: client.chain?.id,
            verifyingContract: validatorAddress
        },
        types: {
            Approve: [{ name: "callDataAndNonceHash", type: "bytes32" }]
        },
        primaryType: "Approve",
        message: {
            callDataAndNonceHash
        }
    })

    return signature
}
