import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import {
    KernelFactoryV2Abi,
    createKernelV2Account
} from "@zerodev/sdk/accounts"
import type { ValidatorInitData } from "@zerodev/sdk/types"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { Address, Hex } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"

export const deserializeSessionKeyAccountV2 = async <
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Parameters<typeof createKernelV2Account>[0],
    sessionKeyAccountParams: string,
    sessionKeySigner?: SmartAccountSigner<TSource, TAddress>
) => {
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: SmartAccountSigner<string, Hex>
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeySigner) signer = sessionKeySigner
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams
    })

    const { index, validatorInitData } = decodeParamsFromInitCodeV2(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: sessionKeyPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        executorData: params.executorData,
        kernelVersion: "0.0.2",
        ...params.validityData
    })

    return createKernelV2Account(client, {
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress
    })
}

export const decodeParamsFromInitCodeV2 = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryV2Abi,
        data: `0x${initCode.slice(42)}`
    })
    if (!createAccountFunctionData) throw new Error("Invalid initCode")
    if (createAccountFunctionData.functionName === "createAccount") {
        index = createAccountFunctionData.args[2]
        validatorInitData = {
            validatorAddress: createAccountFunctionData.args[0],
            enableData: createAccountFunctionData.args[1]
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData }
}
