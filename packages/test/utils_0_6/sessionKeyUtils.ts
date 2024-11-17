import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import type { Action, KernelSmartAccountImplementation } from "@zerodev/sdk"
import { addressToEmptyAccount, createKernelAccount } from "@zerodev/sdk"
import {
    ParamOperator,
    type SessionKeyPlugin,
    deserializeSessionKeyAccount,
    serializeSessionKeyAccount,
    signerToSessionKeyValidator
} from "@zerodev/session-key"
import type { Hex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi"
import {
    Test_ERC20Address,
    getEntryPoint,
    getPublicClient,
    index,
    kernelVersion
} from "./common"

export const getSessionKeyToSessionKeyKernelAccount = async (
    sessionKeyPlugin: SessionKeyPlugin,
    action?: Action
): Promise<SmartAccount<KernelSmartAccountImplementation<"0.6">>> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    return await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin,
            action
        },
        index,
        kernelVersion
    })
}

export const getSignerToSessionKeyKernelAccount = async (): Promise<
    SmartAccount<KernelSmartAccountImplementation<"0.6">>
> => {
    const privateKey = process.env.TEST_PRIVATE_KEY as Hex
    if (!privateKey) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(privateKey)
    const sessionPrivateKey = generatePrivateKey()
    const sessionKey = privateKeyToAccount(sessionPrivateKey)
    const sessionKeyEmptyAccount = addressToEmptyAccount(sessionKey.address)
    const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: { ...signer, source: "local" as "local" | "external" },
        kernelVersion
    })

    const sessionKeyPlugin = await signerToSessionKeyValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        signer: sessionKeyEmptyAccount,
        validatorData: {
            permissions: [
                {
                    target: Test_ERC20Address,
                    abi: TEST_ERC20Abi,
                    functionName: "transfer",
                    args: [
                        {
                            operator: ParamOperator.EQUAL,
                            value: signer.address
                        },
                        null
                    ]
                }
            ]
        }
    })

    const account = await createKernelAccount(publicClient, {
        entryPoint: getEntryPoint(),
        plugins: {
            regular: sessionKeyPlugin,
            sudo: ecdsaValidatorPlugin
        },
        index,
        kernelVersion
    })

    const serializedSessionKeyAccountParams =
        await serializeSessionKeyAccount(account)

    return await deserializeSessionKeyAccount(
        publicClient,
        getEntryPoint(),
        kernelVersion,
        serializedSessionKeyAccountParams,
        sessionKey
    )
}
