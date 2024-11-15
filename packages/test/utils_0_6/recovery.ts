import { createKernelAccount } from "@zerodev/sdk"
import {
    createWeightedECDSAValidator,
    getRecoveryAction
} from "@zerodev/weighted-ecdsa-validator"
import type { Address } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient, index, kernelVersion } from "./common"

export const getRecoveryKernelAccount = async (
    deployedAccountAddress: Address
) => {
    const privateKey1 = generatePrivateKey()
    const signer1 = privateKeyToAccount(privateKey1)
    const recoveryPlugin = await createWeightedECDSAValidator(
        await getPublicClient(),
        {
            entryPoint: getEntryPoint(),
            kernelVersion,
            config: {
                threshold: 100,
                delay: 0,
                signers: [{ address: signer1.address, weight: 100 }]
            },
            signers: [signer1]
        }
    )
    return await createKernelAccount(await getPublicClient(), {
        entryPoint: getEntryPoint(),
        address: deployedAccountAddress,
        plugins: {
            regular: recoveryPlugin,
            action: getRecoveryAction(getEntryPoint().version)
        },
        index,
        kernelVersion
    })
}
