import {
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    toHex
} from "viem"
import { getAction, parseAccount } from "viem/utils"
import { sortByPublicKey } from "../utils.js"
import type { ApproveUserOperationReturnType } from "./approveUserOperation.js"
import {
    sendUserOperation,
    type SendUserOperationParameters,
    type SmartAccount
} from "viem/account-abstraction"
import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation
} from "@zerodev/sdk"
import {
    sendUserOperationWithApprovals,
    type SendUserOperationWithApprovalsParameters
} from "./sendUserOperationWithApprovals.js"
import {
    getValidatorAddress,
    SIGNER_TYPE,
    type WeightedValidatorConfig
} from "../index.js"
import { encodeWebAuthnPubKey } from "@zerodev/webauthn-key"
import { MultiChainWeightedValidatorAbi } from "../abi.js"

export type UpdateSignersDataParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = SendUserOperationParameters<account, accountOverride, calls> & {
    approvals?: ApproveUserOperationReturnType[]
    config: WeightedValidatorConfig
}

export async function updateSignersData<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args: UpdateSignersDataParameters<account, accountOverride, calls>
): Promise<Hash> {
    const { account: account_ = client.account, config, approvals } = args
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>

    const validatorAddress = getValidatorAddress(
        account.entryPoint,
        account.kernelVersion
    )

    // Check if sum of weights is equal or greater than threshold
    let totalWeight = 0
    for (const signer of config.signers) {
        totalWeight += signer.weight
    }
    if (totalWeight < config.threshold) {
        throw new Error(
            `Sum of weights (${totalWeight}) is less than threshold (${config.threshold})`
        )
    }

    // sort signers by address in descending order
    const configSigners = config
        ? [...config.signers]
              .map((signer) =>
                  typeof signer.publicKey === "object"
                      ? {
                            ...signer,
                            publicKey: encodeWebAuthnPubKey(
                                signer.publicKey
                            ) as Hex
                        }
                      : { ...signer, publicKey: signer.publicKey as Hex }
              )
              .sort(sortByPublicKey)
        : []

    const call = {
        to: validatorAddress,
        value: 0n,
        data: encodeFunctionData({
            abi: MultiChainWeightedValidatorAbi,
            functionName: "renew",
            args: [
                concatHex([
                    toHex(config.threshold, { size: 3 }),
                    toHex(config.delay || 0, { size: 6 }),
                    encodeAbiParameters(
                        [{ name: "guardiansData", type: "bytes[]" }],
                        [
                            configSigners.map((cfg) =>
                                concatHex([
                                    cfg.publicKey.length === 42
                                        ? SIGNER_TYPE.ECDSA
                                        : SIGNER_TYPE.PASSKEY,
                                    toHex(cfg.weight, { size: 3 }),
                                    cfg.publicKey
                                ])
                            )
                        ]
                    )
                ])
            ]
        })
    }

    if (approvals) {
        return getAction(
            client,
            sendUserOperationWithApprovals,
            "sendUserOperationWithApprovals"
        )({
            ...args,
            calls: [call]
        } as SendUserOperationWithApprovalsParameters)
    }

    return getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        ...args,
        calls: [call]
    } as SendUserOperationParameters)
}
