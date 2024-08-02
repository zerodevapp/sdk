// @ts-expect-error
import { beforeAll, describe, test } from "bun:test"
import {
    type KernelAccountClient,
    type KernelSmartAccount,
    KernelV3AccountAbi
} from "@zerodev/sdk"
import { getInstallDMAsExecutorCallData } from "@zerodev/session-account"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V07,
    bundlerActions
} from "permissionless"
import { SmartAccount } from "permissionless/accounts"
import { paymasterActionsEip7677 } from "permissionless/experimental/eip7677/clients/decorators/paymasterActionsEip7677"
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint"
import {
    type Chain,
    type Hex,
    type PublicClient,
    type Transport,
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    parseAbiParameters,
    zeroAddress
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { SessionAccount } from "../../../plugins/multi-tenant-session-account"
import { dmActionsEip7710 } from "../../../plugins/multi-tenant-session-account/clients"
import {
    DMVersionToAddressMap,
    ROOT_AUTHORITY
} from "../../../plugins/multi-tenant-session-account/constants"
import type { Delegation } from "../../../plugins/multi-tenant-session-account/types"
import type { YiSubAccount } from "../../../plugins/yiSubAccount"
import { toAllowedTargetsEnforcer } from "../../../plugins/yiSubAccount/enforcers/allowed-targets/toAllowedTargetsEnforcer"
import {
    getEcdsaKernelAccountWithRandomSigner,
    getEntryPoint,
    getKernelAccountClient,
    getPublicClient,
    getSessionAccount,
    getSignerToEcdsaKernelAccount,
    getZeroDevPaymasterClient
} from "./utils"

const TEST_TIMEOUT = 1000000

describe("Yi SubAccount", () => {
    let publicClient: PublicClient
    let mainDelegatorAccount: KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let account: YiSubAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let bundlerClient: BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>
    let kernelClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let sessionAccount: SessionAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    let sessionAccountClient: KernelAccountClient<
        ENTRYPOINT_ADDRESS_V07_TYPE,
        Transport,
        Chain,
        KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    >
    let delegations: Delegation[]

    beforeAll(async () => {
        const ownerPrivateKey = process.env.TEST_PRIVATE_KEY
        if (!ownerPrivateKey) {
            throw new Error("TEST_PRIVATE_KEY is not set")
        }
        publicClient = await getPublicClient()
        mainDelegatorAccount = await getEcdsaKernelAccountWithRandomSigner([
            getInstallDMAsExecutorCallData()
        ])
        kernelClient = await getKernelAccountClient({
            account: mainDelegatorAccount,
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })
        const tx = await kernelClient.sendTransaction({
            to: kernelClient.account.address,
            data: "0x"
        })
        console.log("installModule tx: ", tx)

        bundlerClient = kernelClient.extend(bundlerActions(getEntryPoint()))

        const caveat = toAllowedTargetsEnforcer({
            targets: [zeroAddress]
        })
        const caveats = []
        const privateSessionKey = generatePrivateKey()
        const sessionKeyAccount = privateKeyToAccount(privateSessionKey)
        delegations = [
            {
                delegator: mainDelegatorAccount.address,
                delegate: sessionKeyAccount.address,
                authority: ROOT_AUTHORITY,
                caveats,
                salt: 0n,
                signature: "0x"
            }
        ]

        const kernelClientDM = kernelClient.extend(
            dmActionsEip7710<
                ENTRYPOINT_ADDRESS_V07_TYPE,
                KernelSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
            >()
        )

        const mainDeleGatorSignature = await kernelClientDM.signDelegation({
            delegation: delegations[0]
        })
        console.log({ mainDeleGatorSignature })
        delegations[0].signature = mainDeleGatorSignature
        sessionAccount = await getSessionAccount(delegations, privateSessionKey)
        sessionAccountClient = await getKernelAccountClient({
            // @ts-ignore: fix return type error
            account: sessionAccount,
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const zeroDevPaymaster = getZeroDevPaymasterClient()
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                        entryPoint: getEntryPoint()
                    })
                }
            }
        })
    })

    test(
        "Send tx from subAccount through sessionAccount",
        async () => {
            const userOpHash = await sessionAccountClient.sendUserOperation({
                userOperation: {
                    callData: await sessionAccount.encodeCallData({
                        to: zeroAddress,
                        data: "0x",
                        value: 0n
                    }),
                    preVerificationGas: 84700n,
                    callGasLimit: 1273781n,
                    verificationGasLimit: 726789n
                }
            })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
            console.log(
                "transactionHash",
                `https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`
            )
        },
        TEST_TIMEOUT
    )
})
