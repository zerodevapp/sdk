import { describe, expect, test } from "bun:test"
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants"
import { isRIP7212SupportedNetwork } from "@zerodev/webauthn-key"
import {
    createClient,
    custom,
    decodeAbiParameters,
    toHex,
    zeroHash
} from "viem"
import type { UserOperation } from "viem/account-abstraction"
import {
    PasskeyValidatorContractVersion,
    toPasskeyValidator
} from "./toPasskeyValidator.js"

const WEBAUTHN_SIGNATURE_ABI = [
    { name: "authenticatorData", type: "bytes" },
    { name: "clientDataJSON", type: "string" },
    { name: "responseTypeLocation", type: "uint256" },
    { name: "r", type: "uint256" },
    { name: "s", type: "uint256" },
    { name: "usePrecompiled", type: "bool" }
] as const

// A client that only answers eth_chainId.
const clientOn = (chainId: number) =>
    createClient({
        transport: custom({
            async request({ method }) {
                if (method === "eth_chainId") return toHex(chainId)
                throw new Error(`unexpected RPC call: ${method}`)
            }
        })
    })

describe("passkey validator stub signature", () => {
    // 1 has the P-256 precompile, 100 does not. A custom signMessageCallback
    // sets its own flag, so the stub stays on the Solidity verifier.
    test.each([
        [1, false, true],
        [100, false, false],
        [1, true, false]
    ])(
        "chain %d, custom callback %p: usePrecompiled is %p",
        async (chainId, withCallback, expected) => {
            expect(isRIP7212SupportedNetwork(chainId)).toBe(chainId === 1)
            const validator = await toPasskeyValidator(clientOn(chainId), {
                webAuthnKey: {
                    pubX: 1n,
                    pubY: 2n,
                    authenticatorId: "id",
                    authenticatorIdHash: zeroHash,
                    rpID: "localhost",
                    signMessageCallback: withCallback
                        ? async () => "0x"
                        : undefined
                },
                entryPoint: getEntryPoint("0.7"),
                kernelVersion: KERNEL_V3_1,
                validatorContractVersion:
                    PasskeyValidatorContractVersion.V0_0_3_PATCHED
            })
            const stub = await validator.getStubSignature({} as UserOperation)
            const [, , , , , usePrecompiled] = decodeAbiParameters(
                WEBAUTHN_SIGNATURE_ABI,
                stub
            )
            expect(usePrecompiled).toBe(expected)
        }
    )
})
