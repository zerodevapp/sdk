import { describe, expect, test } from "bun:test"
import { EXEC_TYPE } from "@zerodev/sdk/constants"
import {
    type Address,
    encodeFunctionData,
    getContractAddress,
    parseEther
} from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import { GreeterAbi, GreeterBytecode } from "../../../../test/abis/Greeter"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount,
    newOwner
} from "../../../harness/accounts"
import { setBalance } from "../../../harness/anvil"
import {
    type KernelAccount,
    getKernelClient,
    getPublicClient
} from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"
import { sendCalls } from "../../../harness/permissions"
import { userOpSucceeded } from "../../../harness/receipts"

const publicClient = getPublicClient("sepolia")
const balanceOf = (address: Address) => publicClient.getBalance({ address })
const zeroFees = async () => ({ maxFeePerGas: 0n, maxPriorityFeePerGas: 0n })

async function fundedAccount(
    kernelVersion: (typeof KERNEL_V3_VERSIONS)[number]
) {
    const { account } = await createEcdsaAccount({
        chain: "sepolia",
        kernelVersion
    })
    await setBalance("sepolia", account.address, parseEther("1"))
    return account
}

// Deploys the account first, then returns where a CREATE from it will land.
async function deployedWithNextCreateAddress(account: KernelAccount) {
    expect(
        (await sendCalls(account, [{ to: newOwner().address }])).success
    ).toBeTrue()
    const nonce = await publicClient.getTransactionCount({
        address: account.address
    })
    return getContractAddress({ from: account.address, nonce: BigInt(nonce) })
}

const deployCallData = (account: KernelAccount) =>
    account.encodeDeployCallData({ abi: GreeterAbi, bytecode: GreeterBytecode })

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("sendTransaction with calls[] (batch form) runs every call", async () => {
        const account = await fundedAccount(kernelVersion)
        const [a, b] = [newOwner().address, newOwner().address]
        const client = getKernelClient(account, "sepolia")
        const txHash = await client.sendTransaction({
            calls: [
                { to: a, value: 1n, data: "0x" },
                { to: b, value: 2n, data: "0x" }
            ]
        })
        expect(
            await userOpSucceeded("sepolia", txHash, account.address)
        ).toBeTrue()
        expect(await balanceOf(a)).toBe(1n)
        expect(await balanceOf(b)).toBe(2n)
    })

    if (kernelVersion !== "0.3.0") {
        test("deploys a contract via encodeDeployCallData", async () => {
            const { account } = await createEcdsaAccount({
                chain: "sepolia",
                kernelVersion
            })
            const greeter = await deployedWithNextCreateAddress(account)
            const client = getKernelClient(account, "sepolia")
            const hash = await client.sendUserOperation({
                callData: await deployCallData(account)
            })
            expect(
                (await client.waitForUserOperationReceipt({ hash })).success
            ).toBeTrue()
            expect(
                await publicClient.readContract({
                    address: greeter,
                    abi: GreeterAbi,
                    functionName: "greet"
                })
            ).toBeString()
        })
    }
})

// Kernel 0.3.0 does not revert when a delegatecall fails, so call-gas
// estimation settles on the smallest gas that "succeeds"; CreateCall then runs
// out of gas inside the delegatecall and the op still reports success.
describe("encodeDeployCallData on kernel 0.3.0", () => {
    test("FINDING (current behaviour): with estimated gas the op succeeds but nothing is deployed", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion: "0.3.0"
        })
        const greeter = await deployedWithNextCreateAddress(account)
        const nonceBefore = await publicClient.getTransactionCount({
            address: account.address
        })
        const client = getKernelClient(account, "sepolia")
        const hash = await client.sendUserOperation({
            callData: await deployCallData(account)
        })
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
        expect(await publicClient.getCode({ address: greeter })).toBeUndefined()
        expect(
            await publicClient.getTransactionCount({ address: account.address })
        ).toBe(nonceBefore)
    })

    test("control: with an explicit callGasLimit the same deploy works", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion: "0.3.0"
        })
        const greeter = await deployedWithNextCreateAddress(account)
        const client = getKernelClient(account, "sepolia", {
            paymaster: "none",
            estimateFeesPerGas: zeroFees
        })
        const hash = await client.sendUserOperation({
            callData: await deployCallData(account),
            callGasLimit: 2_000_000n,
            verificationGasLimit: 500_000n,
            preVerificationGas: 100_000n
        })
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
        expect(
            await publicClient.readContract({
                address: greeter,
                abi: GreeterAbi,
                functionName: "greet"
            })
        ).toBeString()
    })
})

test('execType "try" continues past a reverting call (kernel 0.3.3)', async () => {
    const account = await fundedAccount("0.3.3")
    const recipient = newOwner().address
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
                { to: recipient, value: 1n, data: "0x" }
            ],
            "call",
            EXEC_TYPE.TRY_EXEC
        )
    })
    expect(
        (await client.waitForUserOperationReceipt({ hash })).success
    ).toBeTrue()
    // The call after the revert still ran.
    expect(await balanceOf(recipient)).toBe(1n)
})
