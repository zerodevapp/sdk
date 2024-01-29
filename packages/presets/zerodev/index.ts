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
type ERC20Paymaster = Address
type PaymasterType = "NONE" | "SPONSOR" | ERC20Paymaster

function isERC20(value: PaymasterType): value is ERC20Paymaster {
    return isAddress(value)
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
    paymaster = "SPONSOR"
}: {
    chain: TChain
    projectId: string
    signer: SmartAccountSigner<TSource, TAddress>
    provider?: Provider
    index?: bigint
    paymaster?: PaymasterType
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

    let sponsorUserOperation:
        | ((args: {
              userOperation: UserOperation
              entryPoint: Address
          }) => Promise<UserOperation>)
        | undefined = undefined

    if (paymaster !== undefined) {
        const zerodevPaymaster = createZeroDevPaymasterClient({
            chain: chain,
            transport: http(getZeroDevPaymasterRPC(projectId, provider))
        })

        if (isERC20(paymaster)) {
            sponsorUserOperation = async ({
                userOperation
            }): Promise<UserOperation> => {
                return zerodevPaymaster.sponsorUserOperation({
                    userOperation,
                    gasToken: paymaster
                })
            }
        } else if (paymaster === "SPONSOR") {
            sponsorUserOperation = async ({
                userOperation
            }): Promise<UserOperation> => {
                return zerodevPaymaster.sponsorUserOperation({
                    userOperation
                })
            }
        } else if (paymaster !== "NONE") {
            throw new Error("Invalid paymaster type")
        }
    }

    const kernelClient = createKernelAccountClient({
        account,
        chain,
        transport: http(getZeroDevBundlerRPC(projectId, provider)),
        sponsorUserOperation
    })

    return kernelClient as unknown as KernelAccountClient<
        HttpTransport,
        TChain,
        KernelSmartAccount<HttpTransport, TChain>
    >
}
