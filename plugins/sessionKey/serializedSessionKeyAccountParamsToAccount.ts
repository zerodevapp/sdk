import { createKernelAccount } from "@kerneljs/core"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { Address, Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { signerToSessionKeyValidator } from "./toSessionKeyValidatorPlugin"
import { deserializeSessionKeyAccountParams } from "./utils"

export const serializedSessionKeyAccountParamsToAccount = async <
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Parameters<typeof createKernelAccount>[0],
    sessionKeyAccountParams: string,
    sessionKeysigner?: SmartAccountSigner<TSource, TAddress>
) => {
    const params = deserializeSessionKeyAccountParams(sessionKeyAccountParams)
    let signer: SmartAccountSigner<string, Hex>
    if (params.privateKey) signer = privateKeyToAccount(params.privateKey)
    else if (sessionKeysigner) signer = sessionKeysigner
    else throw new Error("No signer or serialized sessionKey provided")

    const sessionKeyPlugin = await signerToSessionKeyValidator(client, {
        signer,
        validatorData: params.sessionKeyParams.sessionKeyData,
        executorData: params.sessionKeyParams.executorData
    })
    return createKernelAccount(client, {
        plugin: sessionKeyPlugin,
        initCode: params.initCode,
        pluginEnableSignature: params.enableSignature
    })
}
