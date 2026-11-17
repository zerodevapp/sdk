import { describe, expect, test } from "bun:test"
import { createClient, custom } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
import {
    WeightedValidatorContractVersion,
    createWeightedValidator
} from "./toWeightedValidatorPlugin.js"
import { decodeSignatures, encodeSignatures } from "./utils.js"

const owner = privateKeyToAccount(
    "0x2827b876ee775816460ab6eb4481352a752101f950899831702ccead54000001"
)

const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"

const getValidator = async () => {
    const signer = {
        account: owner,
        getPublicKey: () => owner.address,
        getDummySignature: () => `0x${"00".repeat(65)}` as `0x${string}`,
        type: "0x01" as never
    }
    const client = createClient({
        chain: mainnet,
        transport: custom({
            request: async ({ method }) => {
                if (method === "eth_chainId") return "0x1"
                throw new Error(`Unexpected RPC method: ${method}`)
            }
        })
    })

    return createWeightedValidator(client, {
        entryPoint: {
            address: entryPointAddress,
            version: "0.7"
        },
        kernelVersion: "0.3.1",
        validatorContractVersion:
            WeightedValidatorContractVersion.V0_0_2_PATCHED,
        signer,
        config: {
            threshold: 1,
            signers: [{ publicKey: owner.address, weight: 1 }]
        }
    })
}

const userOperation = {
    sender: "0x0000000000000000000000000000000000000001",
    nonce: 0n,
    callData: "0x",
    callGasLimit: 100_000n,
    verificationGasLimit: 100_000n,
    preVerificationGas: 50_000n,
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
    signature: "0x"
} as const

describe("createWeightedValidator", () => {
    test("creates a stub signature when the UserOperation signature is undefined", async () => {
        const validator = await getValidator()

        const signature = await validator.getStubSignature({
            ...userOperation,
            signature: undefined
        } as never)

        expect(decodeSignatures(signature)).toHaveLength(1)
    })

    test("replaces its stub while preserving co-signer signatures", async () => {
        const validator = await getValidator()
        const cosignerSignature = `0x01${"11".repeat(65)}` as `0x${string}`
        const stubSignature = await validator.getStubSignature({
            ...userOperation,
            signature: encodeSignatures([cosignerSignature])
        })

        const signature = await validator.signUserOperation({
            ...userOperation,
            signature: stubSignature
        })

        const signatures = decodeSignatures(signature)
        expect(signatures).toHaveLength(2)
        expect(signatures[0]).toBe(cosignerSignature)
        expect(signatures[1]).not.toBe(decodeSignatures(stubSignature)[1])
    })
})
