import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import type { UserOperation } from "permissionless"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { Address, Chain, HttpTransport } from "viem"
import { http, createPublicClient } from "viem"

export type Provider = "STACKUP" | "PIMLICO" | "ALCHEMY" | "GELATO"

const getZeroDevBundlerRPC = (
    projectId: string,
    provider?: Provider
): string => {
    let rpc = `https://rpc.zerodev.app/api/v2/bundler/${projectId}`
    if (provider) {
        rpc += `?bundlerProvider=${provider}`
    }
    return rpc
}

const getZeroDevPaymasterRPC = (
    projectId: string,
    provider?: Provider
): string => {
    let rpc = `https://rpc.zerodev.app/api/v2/paymaster/${projectId}`
    if (provider) {
        rpc += `?paymasterProvider=${provider}`
    }
    return rpc
}

export async function createEcdsaKernelAccountClient<
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>({
    chain,
    projectId,
    signer,
    provider,
    index,
    usePaymaster = true
}: {
    chain: TChain
    projectId: string
    signer: SmartAccountSigner<TSource, TAddress>
    provider?: Provider
    index?: bigint
    usePaymaster?: boolean
}): Promise<
    KernelAccountClient<
        HttpTransport,
        TChain,
        KernelSmartAccount<HttpTransport, TChain>
    >
> {
    const publicClient = createPublicClient({
        transport: http(getZeroDevBundlerRPC(projectId, provider))
    })

    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer
    })

    const account = await createKernelAccount(publicClient, {
        plugins: {
            validator: ecdsaValidator
        },
        index
    })

    const kernelClient = createKernelAccountClient({
        account,
        chain,
        transport: http(getZeroDevBundlerRPC(projectId, provider)),
        sponsorUserOperation: usePaymaster
            ? async ({ userOperation }): Promise<UserOperation> => {
                  const zerodevPaymaster = createZeroDevPaymasterClient({
                      chain: chain,
                      transport: http(
                          getZeroDevPaymasterRPC(projectId, provider)
                      )
                  })
                  return zerodevPaymaster.sponsorUserOperation({
                      userOperation
                  })
              }
            : undefined
    })

    return kernelClient as unknown as KernelAccountClient<
        HttpTransport,
        TChain,
        KernelSmartAccount<HttpTransport, TChain>
    >
}
