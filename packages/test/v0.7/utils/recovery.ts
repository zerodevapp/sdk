import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createKernelAccount } from "@zerodev/sdk"
import {
    createWeightedECDSAValidator,
    getRecoveryAction
} from "@zerodev/weighted-ecdsa-validator"
import type { Address } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getRecoveryKernelAccount = async (
    deployedAccountAddress?: Address
) => {
    const privateKey1 = generatePrivateKey()
    const privateKey2 = generatePrivateKey()
    const signer1 = privateKeyToAccount(privateKey1)
    const signer2 = privateKeyToAccount(privateKey2)
    const publicClient = await getPublicClient()
    const ecdsaPlugin = await signerToEcdsaValidator(publicClient, {
        entryPoint: getEntryPoint(),
        signer: signer1,
        kernelVersion
    })
    const recoveryPlugin = await createWeightedECDSAValidator(publicClient, {
        entryPoint: getEntryPoint(),
        kernelVersion,
        config: {
            threshold: 100,
            delay: 0,
            signers: [{ address: signer2.address, weight: 100 }]
        },
        signers: [signer2]
    })
    return await createKernelAccount(await getPublicClient(), {
        entryPoint: getEntryPoint(),
        address: deployedAccountAddress,
        plugins: {
            sudo: ecdsaPlugin,
            regular: recoveryPlugin,
            action: getRecoveryAction(getEntryPoint().version)
        },
        index,
        kernelVersion
    })
}
