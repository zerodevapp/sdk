import { describe, expect, test } from "bun:test"
import { EIP1271Abi } from "@zerodev/sdk/accounts"
import type { KERNEL_VERSION_TYPE } from "@zerodev/sdk/types"
import * as dotenv from "dotenv"
import { type Address, hashMessage, hashTypedData, zeroAddress } from "viem"
import { validateEnvironmentVariables } from "../v0.7/utils/common"
import {
    TEST_TIMEOUT,
    type VALIDATOR_TYPE,
    chain,
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
                    `should sign typed data with kernel version ${kernelVersion} and ${validatorType} Validator Address ${validatorAddress}`,
                    async () => {
                        const domain = {
                            chainId: 1,
                            name: "Test",
                            verifyingContract: zeroAddress
                        }
                        const primaryType = "Test"
                        const types = {
                            Test: [
                                {
                                    name: "test",
                                    type: "string"
                                }
                            ]
                        }
                        const message = {
                            test: "hello world"
                        }
                        const typedHash = hashTypedData({
                            domain,
                            primaryType,
                            types,
                            message
                        })
                        const kernelClient = await getKernelClient(
                            kernelVersion as KERNEL_VERSION_TYPE,
                            validatorType as VALIDATOR_TYPE,
                            validatorAddress
                        )
                        const accountAddress = kernelClient.account
                            ?.address as Address

                        // deploy account if not deployed
                        await createAccountIfNotDeployed(kernelClient)

                        const signature =
                            await kernelClient.account?.signTypedData({
                                domain,
                                primaryType,
                                types,
                                message
                            })

                        const isValidSignature =
                            await publicClient.readContract({
                                address: accountAddress,
                                abi: EIP1271Abi,
                                functionName: "isValidSignature",
                                args: [typedHash, signature]
                            })

                        expect(isValidSignature).toBe("0x1626ba7e")
                    },
                    TEST_TIMEOUT
                )
            }
        }
    }
})
