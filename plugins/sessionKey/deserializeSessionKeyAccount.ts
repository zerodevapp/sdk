import { KernelAccountAbi, createKernelAccount } from "@kerneljs/core"
import { KernelFactoryAbi } from "@kerneljs/core"
import { toKernelPluginManager } from "@kerneljs/core/accounts"
import type { ValidatorInitData } from "@kerneljs/core/types"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { Address, Hex } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"

export const deserializeSessionKeyAccount = async <
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Parameters<typeof createKernelAccount>[0],
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

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        validator: sessionKeyPlugin,
        pluginEnableSignature: params.enableSignature,
        validatorInitData,
        executorData: params.executorData,
        ...params.validityData
    })

    return createKernelAccount(client, {
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress
    })
}

export const decodeParamsFromInitCode = (initCode: Hex) => {
    let index: bigint | undefined
    let validatorInitData: ValidatorInitData | undefined
    const createAccountFunctionData = decodeFunctionData({
        abi: KernelFactoryAbi,
        data: `0x${initCode.slice(42)}`
    })
    if (!createAccountFunctionData) throw new Error("Invalid initCode")
    if (createAccountFunctionData.functionName === "createAccount") {
        index = createAccountFunctionData.args[2]
        const initializeFunctionData = decodeFunctionData({
            abi: KernelAccountAbi,
            data: createAccountFunctionData.args[1]
        })
        if (!initializeFunctionData) throw new Error("Invalid initCode")
        if (initializeFunctionData.functionName === "initialize") {
            validatorInitData = {
                validatorAddress: initializeFunctionData.args[0],
                enableData: initializeFunctionData.args[1]
            }
        }
    }
    if (index === undefined || validatorInitData === undefined)
        throw new Error("Invalid initCode")
    return { index, validatorInitData }
}
