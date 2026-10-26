import { expect, test } from "bun:test"
import {
    toSignatureCallerPolicy,
    toSudoPolicy
} from "@zerodev/permissions/policies"
import { hashMessage, zeroAddress } from "viem"
import { newOwner } from "../../../../harness/accounts"
import {
    createSessionKeyAccount,
    sendCalls
} from "../../../../harness/permissions"
import { isValid1271 } from "../../../../harness/verify"

test("signature caller policy: only allowed callers see a valid ERC-1271 signature", async () => {
    const allowed = newOwner().address
    const { account } = await createSessionKeyAccount({
        kernelVersion: "0.3.3",
        policies: [
            toSudoPolicy({}),
            toSignatureCallerPolicy({ allowedCallers: [allowed] })
        ]
    })
    // Install the permission (enable mode) before checking signatures.
    expect((await sendCalls(account, [{ to: zeroAddress }])).success).toBeTrue()

    const message = "zerodev e2e signature caller"
    const signature = await account.signMessage({ message })
    const hash = hashMessage(message)
    expect(
        await isValid1271("sepolia", account.address, hash, signature, allowed)
    ).toBeTrue()
    expect(
        await isValid1271(
            "sepolia",
            account.address,
            hash,
            signature,
            newOwner().address
        )
    ).toBeFalse()
})
