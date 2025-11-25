import { describe, expect, test } from "bun:test"
import { EIP1271Abi } from "@zerodev/sdk/accounts"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import * as dotenv from "dotenv"
import { type Address, hashMessage } from "viem"
import { validateEnvironmentVariables } from "../v0.7/utils/common"
import {
    TEST_TIMEOUT,
    type VALIDATOR_TYPE,
    config,
    publicClient
} from "./utils/config"
import { createAccountIfNotDeployed } from "./utils/deployAccount"
import { getKernelClient } from "./utils/getKernelClient"

dotenv.config()

const requiredEnvVars = ["RPC_URL_SEPOLIA", "ZERODEV_RPC", "TEST_PRIVATE_KEY"]

validateEnvironmentVariables(requiredEnvVars)

describe("signMessage", () => {
    for (const kernelVersion in config) {
        for (const validatorType in config[kernelVersion]) {
            for (const validatorAddress of config[kernelVersion][
                validatorType
            ]) {
                test(
                    `should sign message with kernel version ${kernelVersion} and ${validatorType} Validator Address ${validatorAddress}`,
                    async () => {
                        const message = "hello world"
                        const kernelClient = await getKernelClient(
                            kernelVersion as KERNEL_VERSION_TYPE,
                            validatorType as VALIDATOR_TYPE,
                            validatorAddress
                        )

                        // deploy account if not deployed
                        await createAccountIfNotDeployed(kernelClient)

                        const signature =
                            await kernelClient.account?.signMessage({
                                message: message
                            })

                        const isValidSignature =
                            await publicClient.readContract({
                                address: kernelClient.account
                                    ?.address as Address,
                                abi: EIP1271Abi,
                                functionName: "isValidSignature",
                                args: [hashMessage(message), signature]
                            })

                        expect(isValidSignature).toBe("0x1626ba7e")
                    },
                    TEST_TIMEOUT
                )

                test(
                    `should sign raw message with kernel version ${kernelVersion} and ${validatorType} Validator Address ${validatorAddress}`,
                    async () => {
                        const rawMessage =
                            "0x1234567890123456789012345678901234567890123456789012345678901234"
                        const kernelClient = await getKernelClient(
                            kernelVersion as KERNEL_VERSION_TYPE,
                            validatorType as VALIDATOR_TYPE,
                            validatorAddress as Address
                        )

                        // deploy account if not deployed
                        await createAccountIfNotDeployed(kernelClient)

                        const signature =
                            await kernelClient.account?.signMessage({
                                message: {
                                    raw: rawMessage
                                }
                            })
                        const isValidSignature =
                            await publicClient.readContract({
                                address: kernelClient.account
                                    ?.address as Address,
                                abi: EIP1271Abi,
                                functionName: "isValidSignature",
                                args: [
                                    hashMessage({
                                        raw: rawMessage
                                    }),
                                    signature
                                ]
                            })
                        expect(isValidSignature).toBe("0x1626ba7e")
                    },
                    TEST_TIMEOUT
                )
            }
        }
    }
})
