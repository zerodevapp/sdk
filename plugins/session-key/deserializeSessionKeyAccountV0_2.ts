import { toSigner } from "@zerodev/sdk"
import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import {
    KernelFactoryV2Abi,
    createKernelAccountV0_2
} from "@zerodev/sdk/accounts"
import type {
    EntryPointType,
    Signer,
    ValidatorInitData
} from "@zerodev/sdk/types"
import type { GetKernelVersion } from "@zerodev/sdk/types"
import type { Address, Client, Hex, LocalAccount } from "viem"
import { decodeFunctionData } from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { SESSION_KEY_VALIDATOR_ADDRESS } from "./index.js"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"

export const deserializeSessionKeyAccountV0_2 = async <
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    entryPoint: EntryPointType<entryPointVersion>,
    sessionKeyAccountParams: string,
    sessionKeySigner?: Signer,
    validatorAddress: Address = SESSION_KEY_VALIDATOR_ADDRESS
) => {
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: LocalAccount
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeySigner)
        signer = await toSigner({ signer: sessionKeySigner })
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams,
        entryPoint,
        kernelVersion: "0.0.2" as GetKernelVersion<entryPointVersion>,
        validatorAddress
    })

    const { index, validatorInitData } = decodeParamsFromInitCodeV2(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: sessionKeyPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        action: params.action,
        kernelVersion: "0.0.2",
        entryPoint,
        ...params.validityData
    })

    return createKernelAccountV0_2(client, {
        plugins: kernelPluginManager,
        index,
        address: params.accountParams.accountAddress,
        entryPoint: { address: entryPoint.address, version: "0.6" }
    })
}

export const decodeParamsFromInitCodeV2 = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    if (initCode === "0x") return { index, validatorInitData }
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryV2Abi,
        data: `0x${initCode.slice(42)}`
    })
    if (createAccountFunctionData.functionName === "createAccount") {
        index = createAccountFunctionData.args[2]
        validatorInitData = {
            validatorAddress: createAccountFunctionData.args[0],
            identifier: createAccountFunctionData.args[0],
            enableData: createAccountFunctionData.args[1]
        }
    }
    return { index, validatorInitData }
}
