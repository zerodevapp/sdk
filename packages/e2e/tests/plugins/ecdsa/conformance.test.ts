import { createEcdsaAccount } from "../../../harness/accounts"
import { runCoreFlows } from "../../core/conformance"

runCoreFlows({
    name: "ecdsa",
    makeAccount: async (args) => (await createEcdsaAccount(args)).account
})
