import { expect, test } from "bun:test"
import { EXEC_TYPE } from "@zerodev/sdk/constants"
import { encodeFunctionData, getContractAddress, zeroAddress } from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import { GreeterAbi, GreeterBytecode } from "../../../../test/abis/Greeter"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount,
    newOwner
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("sendTransaction with calls[] (batch form)", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const client = getKernelClient(account, "sepolia")
        const txHash = await client.sendTransaction({
            calls: [
                { to: newOwner().address, value: 0n, data: "0x" },
                { to: newOwner().address, value: 0n, data: "0x" }
            ]
        })
        const receipt = await getPublicClient("sepolia").getTransactionReceipt({
            hash: txHash
        })
        expect(receipt.status).toBe("success")
    })

    // On 0.3.0 the delegatecall into Safe's CreateCall does not execute: the op
    // reports success but nothing is deployed and the account nonce stays put.
    const deployTest = kernelVersion === "0.3.0" ? test.failing : test
    deployTest(
        `${kernelVersion === "0.3.0" ? "NEW BUG (encodeDeployCallData deploys nothing on 0.3.0): " : ""}deploys a contract via encodeDeployCallData`,
        async () => {
            const { account } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            const client = getKernelClient(account, "sepolia")
            // Deploy the account first so its contract nonce is known (1).
            await client.waitForUserOperationReceipt({
                hash: await client.sendUserOperation({
                    calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
                })
            })
            const hash = await client.sendUserOperation({
                callData: await account.encodeDeployCallData({
                    abi: GreeterAbi,
                    bytecode: GreeterBytecode
                })
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()
            const greeter = getContractAddress({
                from: account.address,
                nonce: 1n
            })
            const code = await getPublicClient("sepolia").getCode({
                address: greeter
            })
            expect(code && code.length > 2).toBeTrue()
        }
    )
})

test("delegatecall callType is encoded and executes (kernel 0.3.3)", async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
    })
    const client = getKernelClient(account, "sepolia")
    // Delegatecall into an address without code is a successful no-op.
    const hash = await client.sendUserOperation({
        callData: await account.encodeCalls(
            [{ to: newOwner().address, value: 0n, data: "0x" }],
            "delegatecall"
        )
    })
    expect(
        (await client.waitForUserOperationReceipt({ hash })).success
    ).toBeTrue()
})

test('execType "try" tolerates a reverting inner call (kernel 0.3.3)', async () => {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion: "0.3.3"
    })
    const client = getKernelClient(account, "sepolia")
    const reverting = encodeFunctionData({
        abi: entryPoint07Abi,
        functionName: "withdrawTo",
        args: [account.address, 1n]
    })
    const hash = await client.sendUserOperation({
        callData: await account.encodeCalls(
            [
                { to: ENTRY_POINT.address, value: 0n, data: reverting },
                { to: zeroAddress, value: 0n, data: "0x" }
            ],
            "call",
            EXEC_TYPE.TRY_EXEC
        )
    })
    expect(
        (await client.waitForUserOperationReceipt({ hash })).success
    ).toBeTrue()
})
