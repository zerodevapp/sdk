import { KernelAccountAbi, createKernelAccount } from "@zerodev/sdk"
import { KernelFactoryAbi } from "@zerodev/sdk"
import { toKernelPluginManager } from "@zerodev/sdk/accounts"
import type { ValidatorInitData } from "@zerodev/sdk/types"
import type { Hex } from "viem"
import { decodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { toECDSASigner } from "./signers/toECDSASigner"
import type { ModularSigner } from "./signers/types"
import { createPermissionValidator } from "./toModularPermissionValidatorPlugin"
import { deserializeModularPermissionAccountParams } from "./utils"

export const deserializeModularPermissionAccount = async (
    client: Parameters<typeof createKernelAccount>[0],
    sessionKeyAccountParams: string,
    modularSigner?: ModularSigner
) => {
    const params = deserializeModularPermissionAccountParams(
        sessionKeyAccountParams
    )
    let signer: ModularSigner
    if (params.privateKey)
        // TODO: check if this is the correct way to handle `privateKey` or do we need even private key here?
        signer = toECDSASigner({
            signer: privateKeyToAccount(params.privateKey)
        })
    else if (modularSigner) signer = modularSigner
    else throw new Error("No signer or serialized sessionKey provided")

    const modularPermissionPlugin = await createPermissionValidator(client, {
        signer,
        // TODO: check how to handle `undefined` values
        policies: params.modularPermissionParams.policies || [],
        validUntil: params.modularPermissionParams.validUntil || 0,
        validAfter: params.modularPermissionParams.validAfter || 0
    })

    const { index, validatorInitData } = decodeParamsFromInitCode(
        params.accountParams.initCode
    )

    const kernelPluginManager = await toKernelPluginManager(client, {
        regular: modularPermissionPlugin,
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
