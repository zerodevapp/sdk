import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { toMultiChainECDSAValidator } from "@zerodev/multi-chain-ecdsa-validator"
import { createMultiChainWeightedValidator } from "@zerodev/multi-chain-weighted-validator"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import { getEntryPoint } from "@zerodev/sdk/constants"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import { createWeightedECDSAValidator } from "@zerodev/weighted-ecdsa-validator"
import {
    WeightedValidatorContractVersion,
    createWeightedValidator,
    toECDSASigner
} from "@zerodev/weighted-validator"
import { satisfies } from "semver"
import { http, type Address } from "viem"
import {
    type VALIDATOR_TYPE,
    ZERODEV_RPC,
    chain,
    publicClient,
    signer
} from "./config"

function getEntryPointVersion(kernelVersion: KERNEL_VERSION_TYPE) {
    if (satisfies(kernelVersion, ">=0.0.2 <0.3.0")) return getEntryPoint("0.6")
    return getEntryPoint("0.7")
}

async function getValidator(
    kernelVersion: KERNEL_VERSION_TYPE,
    validatorType: VALIDATOR_TYPE,
    validatorAddress: Address
) {
    switch (validatorType) {
        case "ECDSA":
            return signerToEcdsaValidator(publicClient, {
                entryPoint: getEntryPointVersion(kernelVersion),
                signer: signer,
                kernelVersion
            })
        case "WEIGHTED_ECDSA":
            return createWeightedECDSAValidator(publicClient, {
                entryPoint: getEntryPointVersion(kernelVersion),
                kernelVersion,
                signers: [signer],
                config: {
                    threshold: 100,
                    delay: 0,
                    signers: [{ address: signer.address, weight: 100 }]
                }
            })
        case "WEIGHTED_R1_K1":
            return createWeightedValidator(publicClient, {
                entryPoint: getEntryPointVersion(kernelVersion),
                kernelVersion,
                signer: await toECDSASigner({
                    signer
                }),
                config: {
                    threshold: 100,
                    delay: 0,
                    signers: [{ publicKey: signer.address, weight: 100 }]
                },
                validatorAddress,
                // dumb version, use validatorAddress
                validatorContractVersion:
                    WeightedValidatorContractVersion.V0_0_2_PATCHED
            })
        case "MULTI_CHAIN_ECDSA":
            return toMultiChainECDSAValidator(publicClient, {
                entryPoint: getEntryPointVersion(kernelVersion),
                kernelVersion,
                signer: signer,
                multiChainIds: [chain.id]
            })
        case "MULTI_CHAIN_WEIGHTED":
            return createMultiChainWeightedValidator(publicClient, {
                entryPoint: getEntryPointVersion(kernelVersion),
                kernelVersion,
                signer: await toECDSASigner({
                    signer
                }),
                config: {
                    threshold: 100,
                    signers: [{ publicKey: signer.address, weight: 100 }]
                }
            })
        default:
            throw new Error(`Invalid validator type: ${validatorType}`)
    }
}

export async function getKernelClient(
    kernelVersion: KERNEL_VERSION_TYPE,
    validatorType: VALIDATOR_TYPE,
    validatorAddress: Address
) {
    const validator = await getValidator(
        kernelVersion,
        validatorType,
        validatorAddress
    )

    const account = await createKernelAccount(publicClient, {
        entryPoint: getEntryPointVersion(kernelVersion),
        kernelVersion,
        plugins: {
            sudo: validator
        }
    })

    const zerodevPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(ZERODEV_RPC)
    })

    return createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(ZERODEV_RPC),
        // Required - the public client
        client: publicClient,
        paymaster: {
            getPaymasterData(userOperation) {
                return zerodevPaymaster.sponsorUserOperation({ userOperation })
            }
        }
    })
}
