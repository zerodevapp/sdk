import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import {
    KernelFactoryV2Abi,
    createKernelAccountV0_2
} from "@zerodev/sdk/accounts"
import type { ValidatorInitData } from "@zerodev/sdk/types"
import type { GetKernelVersion } from "@zerodev/sdk/types/kernel.js"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Address, Hex } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { SESSION_KEY_VALIDATOR_ADDRESS } from "./index.js"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin.js"
import { deserializeSessionKeyAccountParams } from "./utils.js"

export const deserializeSessionKeyAccountV0_2 = async <
    entryPoint extends EntryPoint,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Parameters<typeof createKernelAccountV0_2>[0],
    entryPointAddress: entryPoint,
    sessionKeyAccountParams: string,
    sessionKeySigner?: SmartAccountSigner<TSource, TAddress>,
    validatorAddress: Address = SESSION_KEY_VALIDATOR_ADDRESS
) => {
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: SmartAccountSigner<string, Hex>
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeySigner) signer = sessionKeySigner
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams,
        entryPoint: entryPointAddress,
        kernelVersion: "0.0.2" as GetKernelVersion<entryPoint>,
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
        entryPoint: entryPointAddress,
        ...params.validityData
    })

    return createKernelAccountV0_2(client, {
        plugins: kernelPluginManager,
        index,
        deployedAccountAddress: params.accountParams.accountAddress,
        entryPoint: entryPointAddress
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
