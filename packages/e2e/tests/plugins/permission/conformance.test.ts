import { toSudoPolicy } from "@zerodev/permissions/policies"
import { createSessionKeyAccount } from "../../../harness/permissions"
import { runCoreFlows } from "../../core/conformance"

runCoreFlows({
    name: "permission (sudo policy)",
    signatures: false,
    makeAccount: async ({ chain, kernelVersion, owner, index }) =>
        (
            await createSessionKeyAccount({
                chain,
                kernelVersion,
                owner,
                index,
                policies: [toSudoPolicy({})]
            })
        ).account
})
