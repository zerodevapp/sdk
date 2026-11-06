import { expect, test } from "bun:test"
import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator"
import { constants } from "@zerodev/sdk"
import { zeroAddress } from "viem"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { getKernelClient } from "../../../harness/clients"
import { forEachKernelVersion } from "../../../harness/matrix"
import { isDeployed } from "../../../harness/verify"

forEachKernelVersion(KERNEL_V3_VERSIONS, (kernelVersion) => {
    test("address matches getKernelAddressFromECDSA", async () => {
        const { account, owner, index } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion
        })
        const expected = await getKernelAddressFromECDSA({
            entryPoint: ENTRY_POINT,
            kernelVersion,
            eoaAddress: owner.address,
            index,
            initCodeHash:
                constants.KernelVersionToAddressesMap[kernelVersion]
                    .initCodeHash ?? "0x"
        })
        expect(account.address).toBe(expected)
    })

    test("deploys without the meta factory (useMetaFactory: false)", async () => {
        const { account } = await createEcdsaAccount({
            chain: "sepolia",
            kernelVersion,
            useMetaFactory: false
        })
        const client = getKernelClient(account, "sepolia")
        const hash = await client.sendUserOperation({
            calls: [{ to: zeroAddress, value: 0n, data: "0x" }]
        })
        expect(
            (await client.waitForUserOperationReceipt({ hash })).success
        ).toBeTrue()
        expect(await isDeployed("sepolia", account.address)).toBeTrue()
    })
})
