import {
    AccountNotFoundError,
    type Action,
    type KernelSmartAccountImplementation,
    KernelV3AccountAbi,
    getEncodedPluginsData,
    isPluginInitialized
} from "@zerodev/sdk"
import {
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    zeroAddress
} from "viem"
import {
    getAbiItem,
    getAction,
    parseAccount,
    toFunctionSelector
} from "viem/utils"
import { encodeSignatures } from "../utils.js"
import {
    prepareUserOperation,
    type PrepareUserOperationParameters,
    sendUserOperation,
    type SendUserOperationParameters,
    type SmartAccount,
    type UserOperation
} from "viem/account-abstraction"

export type SendUserOperationWithSignaturesParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined,
    accountOverride extends SmartAccount | undefined = SmartAccount | undefined,
    calls extends readonly unknown[] = readonly unknown[]
> = SendUserOperationParameters<account, accountOverride, calls> & {
    signatures: Hex[]
}

export async function sendUserOperationWithSignatures<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined,
    accountOverride extends SmartAccount | undefined = undefined,
    calls extends readonly unknown[] = readonly unknown[]
>(
    client: Client<Transport, chain, account>,
    args_: SendUserOperationWithSignaturesParameters<
        account,
        accountOverride,
        calls
    >
): Promise<Hash> {
    const args = args_ as SendUserOperationWithSignaturesParameters
    const { account: account_ = client.account } = args
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>

    const { signatures, ..._userOperation } = args

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
                await account.kernelPluginManager.regularValidator.getStubSignature(
                    _userOperation as UserOperation
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
                prepareUserOperation,
                "prepareUserOperation"
            )(_userOperation as PrepareUserOperationParameters)

            const encodedSignatures = await getEncodedPluginsData({
                enableSignature: encodeSignatures(signatures),
                userOpSignature:
                    await account.kernelPluginManager.signUserOperationWithActiveValidator(
                        userOperation as UserOperation
                    ),
                action,
                enableData: await account.kernelPluginManager.getEnableData(
                    account.address
                )
            })

            userOperation.signature = encodedSignatures

            return await getAction(
                client,
                sendUserOperation,
                "sendUserOperation"
            )({ ...userOperation } as SendUserOperationParameters<
                account,
                accountOverride
            >)

            // if the regular validator is enabled, use signUserOperationWithActiveValidator directly
        } else {
            const userOperation = await getAction(
                client,
                prepareUserOperation,
                "prepareUserOperation"
            )(args as PrepareUserOperationParameters)

            userOperation.signature =
                await account.kernelPluginManager.signUserOperationWithActiveValidator(
                    userOperation as UserOperation
                )

            return await getAction(
                client,
                sendUserOperation,
                "sendUserOperation"
            )({ ...userOperation } as SendUserOperationParameters<
                account,
                accountOverride
            >)
        }
    }

    const encodedSignatures = encodeSignatures(signatures)
    _userOperation.signature = encodedSignatures
    _userOperation.signature = await account.getStubSignature(
        _userOperation as UserOperation
    )
    const userOperation = await getAction(
        client,
        prepareUserOperation,
        "prepareUserOperation"
    )(_userOperation as PrepareUserOperationParameters)
    userOperation.signature = encodedSignatures

    userOperation.signature = await account.signUserOperation(
        userOperation as UserOperation
    )

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({ ...userOperation } as SendUserOperationParameters<
        account,
        accountOverride
    >)
}
