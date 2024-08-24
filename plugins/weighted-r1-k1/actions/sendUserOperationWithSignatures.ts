import {
    type Action,
    type KernelSmartAccount,
    KernelV3AccountAbi,
    getEncodedPluginsData,
    isPluginInitialized
} from "@zerodev/sdk"
import {
    AccountOrClientNotFoundError,
    type UserOperation,
    parseAccount
} from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import { sendUserOperation as sendUserOperationBundler } from "permissionless/actions"
import { prepareUserOperationRequest } from "permissionless/actions/smartAccount"
import type { SendUserOperationParameters } from "permissionless/actions/smartAccount/sendUserOperation"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    zeroAddress
} from "viem"
import type { Prettify } from "viem/chains"
import { getAbiItem, getAction, toFunctionSelector } from "viem/utils"
import { encodeSignatures } from "../utils.js"

export type SendUserOperationWithSignaturesParameters<
    entryPoint extends EntryPoint,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = Prettify<
    SendUserOperationParameters<entryPoint, TAccount> & {
        signatures: Hex[]
    }
>

export async function sendUserOperationWithSignatures<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        SendUserOperationWithSignaturesParameters<entryPoint, TAccount>
    >
): Promise<Hash> {
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountOrClientNotFoundError()

    const account = parseAccount(account_) as KernelSmartAccount<entryPoint>

    const { userOperation: _userOperation, signatures } = args

    const action: Action = {
        selector: toFunctionSelector(
            getAbiItem({ abi: KernelV3AccountAbi, name: "execute" })
        ),
        address: zeroAddress
    }

    // check if regular validator exists
    if (account.kernelPluginManager.regularValidator) {
        const isPluginEnabled =
            (await account.kernelPluginManager.isEnabled(
                account.address,
                action.selector
            )) ||
            (await isPluginInitialized(
                client,
                account.address,
                account.kernelPluginManager.address
            ))

        // if the regular validator is not enabled, encode with enable signatures
        if (!isPluginEnabled) {
            const dummySignature =
                await account.kernelPluginManager.regularValidator.getDummySignature(
                    _userOperation as UserOperation<
                        GetEntryPointVersion<entryPoint>
                    >
                )

            const encodedDummySignatures = await getEncodedPluginsData({
                enableSignature: encodeSignatures(signatures),
                userOpSignature: dummySignature,
                action,
                enableData: await account.kernelPluginManager.getEnableData(
                    account.address
                )
            })

            _userOperation.signature = encodedDummySignatures

            const userOperation = await getAction(
                client,
                prepareUserOperationRequest<
                    entryPoint,
                    TTransport,
                    TChain,
                    TAccount
                >,
                "prepareUserOperationRequest"
            )(args)

            const encodedSignatures = await getEncodedPluginsData({
                enableSignature: encodeSignatures(signatures),
                userOpSignature:
                    await account.kernelPluginManager.signUserOperationWithActiveValidator(
                        userOperation as UserOperation<
                            GetEntryPointVersion<entryPoint>
                        >
                    ),
                action,
                enableData: await account.kernelPluginManager.getEnableData(
                    account.address
                )
            })

            userOperation.signature = encodedSignatures

            return sendUserOperationBundler(client, {
                userOperation: userOperation as UserOperation<
                    GetEntryPointVersion<entryPoint>
                >,
                entryPoint: account.entryPoint
            })

            // if the regular validator is enabled, use signUserOperationWithActiveValidator directly
        } else {
            const userOperation = await getAction(
                client,
                prepareUserOperationRequest<
                    entryPoint,
                    TTransport,
                    TChain,
                    TAccount
                >,
                "prepareUserOperationRequest"
            )(args)

            userOperation.signature =
                await account.kernelPluginManager.signUserOperationWithActiveValidator(
                    userOperation as UserOperation<
                        GetEntryPointVersion<entryPoint>
                    >
                )

            return sendUserOperationBundler(client, {
                userOperation: userOperation as UserOperation<
                    GetEntryPointVersion<entryPoint>
                >,
                entryPoint: account.entryPoint
            })
        }
    }

    const encodedSignatures = encodeSignatures(signatures)
    _userOperation.signature = encodedSignatures
    _userOperation.signature = await account.getDummySignature(
        _userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )
    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )(args)
    userOperation.signature = encodedSignatures

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    )

    return sendUserOperationBundler(client, {
        userOperation: userOperation as UserOperation<
            GetEntryPointVersion<entryPoint>
        >,
        entryPoint: account.entryPoint
    })
}
