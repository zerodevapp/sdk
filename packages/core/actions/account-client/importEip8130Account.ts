import {
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    concatHex,
    decodeAbiParameters,
    encodeFunctionData,
    keccak256,
    pad,
    parseAbi,
    parseAbiParameters,
    toHex
} from "viem"
import {
    type SendUserOperationParameters,
    type SmartAccount,
    sendUserOperation
} from "viem/account-abstraction"
import { getAction, parseAccount } from "viem/utils"
import type { KernelSmartAccountImplementation } from "../../accounts/index.js"
import { KernelV3AccountAbi } from "../../accounts/kernel/abi/kernel_v_3_0_0/KernelAccountAbi.js"
import { AccountNotFoundError } from "../../errors/index.js"
import type { KernelValidator } from "../../types/kernel.js"

/**
 * Kernel8130: Kernel v3.1 + `importToKeystore`, bound to EntryPoint 0.7 and the
 * canonical EIP-8130 Keystore. Deployed via the deterministic CREATE2 factory
 * (salt 0), so the address is the same on every chain with that Keystore.
 */
export const kernel8130ImplementationAddress: Address =
    "0x8690157bAC878B2d5e50a0F6f1675aac3963Bb54"

/**
 * EIP-8130 canonical authenticators (base/eip-8130 deployment, identical on
 * every chain): the native ecrecover sentinel and the WebAuthn verifier.
 */
const ecrecoverAuthenticator: Address =
    "0x0000000000000000000000000000000000000001"
const passkeyAuthenticator: Address =
    "0x813007b6b1b48E75D91dEc5927ab515d12a0F1d0"

const kernel8130Abi = parseAbi([
    "struct InitialActor { bytes32 actorId; address authenticator; uint16 scope; bytes policyData; }",
    "function importToKeystore(InitialActor[] actors) payable"
])

export type ImportEip8130AccountParameters<
    account extends SmartAccount | undefined = SmartAccount | undefined
> = {
    account?: account | SmartAccount
    /** Kernel8130 implementation to upgrade to. Defaults to the canonical deployment. */
    implementation?: Address
}

type Eip8130Actor = { actorId: Hex; authenticator: Address }

/**
 * Maps the Kernel sudo validator's key to its EIP-8130 canonical-authenticator
 * actor, with the actorId per the spec's "Canonical Authenticator Set": ECDSA
 * owner -> `k1` (`bytes32(address)`), passkey -> `passkey`
 * (`keccak256(x || y)`). Both validators expose the key as their enable data.
 */
async function sudoValidatorToActor(
    sudo: KernelValidator
): Promise<Eip8130Actor> {
    const enableData = await sudo.getEnableData()
    switch (sudo.source) {
        case "ECDSAValidator":
        case "MultiChainECDSAValidator":
            return {
                actorId: pad(enableData, { size: 32 }),
                authenticator: ecrecoverAuthenticator
            }
        case "WebAuthnValidator":
        case "MultiChainWebAuthnValidator": {
            const [{ x, y }] = decodeAbiParameters(
                parseAbiParameters("(uint256 x, uint256 y), bytes32"),
                enableData
            )
            return {
                actorId: keccak256(
                    concatHex([toHex(x, { size: 32 }), toHex(y, { size: 32 })])
                ),
                authenticator: passkeyAuthenticator
            }
        }
        default:
            throw new Error(
                `EIP-8130 import needs an ECDSA or WebAuthn sudo validator, got ${sudo.source}`
            )
    }
}

/**
 * Imports the Kernel into the EIP-8130 Keystore from the 4337 side: one
 * UserOperation that deploys the Kernel if it is still counterfactual, upgrades
 * it to Kernel8130, and calls `importToKeystore` with the sudo key as the sole
 * unrestricted (admin) actor. Returns the UserOperation hash.
 */
export async function importEip8130Account<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined
>(
    client: Client<Transport, chain, account>,
    {
        account: account_ = client.account,
        implementation = kernel8130ImplementationAddress
    }: ImportEip8130AccountParameters<account> = {}
): Promise<Hash> {
    if (!account_) throw new AccountNotFoundError()
    const account = parseAccount(
        account_
    ) as SmartAccount<KernelSmartAccountImplementation>
    // Kernel8130 is a v3 build; `upgradeTo` from a v2 storage layout bricks the account.
    if (!account.kernelVersion.startsWith("0.3")) {
        throw new Error(
            `EIP-8130 import needs Kernel v3, got ${account.kernelVersion}`
        )
    }
    const sudo = account.kernelPluginManager.sudoValidator
    if (!sudo) throw new Error("EIP-8130 import needs the sudo validator")
    const actor = await sudoValidatorToActor(sudo)

    return getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        account,
        calls: [
            {
                to: account.address,
                data: encodeFunctionData({
                    abi: KernelV3AccountAbi,
                    functionName: "upgradeTo",
                    args: [implementation]
                })
            },
            {
                to: account.address,
                data: encodeFunctionData({
                    abi: kernel8130Abi,
                    functionName: "importToKeystore",
                    args: [[{ ...actor, scope: 0, policyData: "0x" }]]
                })
            }
        ]
    } as SendUserOperationParameters)
}
