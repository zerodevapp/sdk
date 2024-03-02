import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless"
import type { SmartAccountSigner } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types"
import type { Address, Chain, HttpTransport } from "viem"
import { http, createPublicClient, isAddress } from "viem"

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

// An enum type called "PAYMASTER" with the following values:
// - "NONE"
// - "SPONSOR"
// - "ERC20", which should wrap a string
export type ERC20Paymaster = Address
export type PaymasterType = "NONE" | "SPONSOR" | ERC20Paymaster

function isERC20(value: PaymasterType): value is ERC20Paymaster {
    return isAddress(value)
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function isValidPaymasterType(value: any): value is PaymasterType {
    return value === "NONE" || value === "SPONSOR" || isERC20(value)
}

export async function createEcdsaKernelAccountClient<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>({
    chain,
    projectId,
    signer,
    provider,
    index,
    paymaster = "SPONSOR"
}: {
    chain: TChain
    projectId: string
    signer: SmartAccountSigner<TSource, TAddress>
    paymaster: PaymasterType
    provider?: Provider
    index?: bigint
}): Promise<
    KernelAccountClient<
        entryPoint,
        HttpTransport,
        TChain,
        KernelSmartAccount<entryPoint, HttpTransport, TChain>
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
            sudo: ecdsaValidator
        },
        index,
        entryPoint: ENTRYPOINT_ADDRESS_V06
    })

    if (!isValidPaymasterType(paymaster)) {
        throw new Error("Invalid paymaster type")
    }

    const zerodevPaymaster = createZeroDevPaymasterClient({
        chain: chain,
        transport: http(getZeroDevPaymasterRPC(projectId, provider)),
        entryPoint: ENTRYPOINT_ADDRESS_V06
    })

    const kernelClient = createKernelAccountClient({
        account,
        chain,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        bundlerTransport: http(getZeroDevBundlerRPC(projectId, provider)),
        middleware:
            paymaster !== "NONE"
                ? {
                      sponsorUserOperation: async ({
                          userOperation,
                          entryPoint
                      }) => {
                          if (isERC20(paymaster)) {
                              return zerodevPaymaster.sponsorUserOperation({
                                  userOperation,
                                  entryPoint,
                                  gasToken: paymaster
                              })
                          }
                          return zerodevPaymaster.sponsorUserOperation({
                              userOperation,
                              entryPoint
                          })
                      }
                  }
                : undefined
    })

    return kernelClient as unknown as KernelAccountClient<
        entryPoint,
        HttpTransport,
        TChain,
        KernelSmartAccount<entryPoint, HttpTransport, TChain>
    >
}
