import { toSigner, validateKernelVersionWithEntryPoint } from "@zerodev/sdk"
import { satisfiesRange } from "@zerodev/sdk"
import type {
    EntryPointType,
    GetKernelVersion,
    KernelValidator,
    Signer
} from "@zerodev/sdk/types"
import type { TypedData } from "abitype"
import {
    type Address,
    type Client,
    type Hex,
    stringToHex,
    type TypedDataDefinition,
    zeroAddress,
    bytesToHex
} from "viem"
import {
    type EntryPointVersion,
    type UserOperation,
    getUserOperationHash
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, signTypedData } from "viem/actions"
import {
    kernelVersionRangeToValidatorVersion,
    validatorAddresses
} from "./constants.js"

export const getValidatorAddress = <
    entryPointVersion extends EntryPointVersion
>(
    entryPoint: EntryPointType<entryPointVersion>,
    kernelVersion: GetKernelVersion<entryPointVersion>,
    validatorAddress?: Address
): { validatorAddress: Address; validatorVersion: string } => {
    validateKernelVersionWithEntryPoint(entryPoint.version, kernelVersion)
    const validatorVersion = Object.entries(
        kernelVersionRangeToValidatorVersion
    ).find(([range]) => satisfiesRange(kernelVersion, range))?.[1]
    if (!validatorVersion && !validatorAddress) {
        throw new Error(
            `Validator not found for Kernel version: ${kernelVersion}`
        )
    }

    return {
        validatorAddress:
            validatorAddress ??
            validatorAddresses[validatorVersion as string] ??
            zeroAddress,
        validatorVersion: validatorVersion as string
    }
}

export type SMART_ACCOUNT_TYPE = "SAFE" | "OTHER"

export async function signerToSmartAccountValidator<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        signer,
        entryPoint,
        kernelVersion,
        validatorAddress: _validatorAddress
    }: {
        signer: Signer
        smartAccountType: SMART_ACCOUNT_TYPE
        entryPoint: EntryPointType<entryPointVersion>
        kernelVersion: GetKernelVersion<entryPointVersion>
        validatorAddress?: Address
    }
): Promise<KernelValidator<"ERC1271Validator">> {
    const { validatorAddress, validatorVersion } = getValidatorAddress(
        entryPoint,
        kernelVersion,
        _validatorAddress
    )
    const viemSigner = await toSigner({ signer })

    // Fetch chain id
    const chainId = await getChainId(client)

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message: message_ }) {
            const message = (() => {
                if (typeof message_ === "string") return stringToHex(message_)
                if (typeof message_.raw === "string") return message_.raw
                return bytesToHex(message_.raw)
            })()
            const signature = await signTypedData(client, {
                account: viemSigner,
                types: {
                    EIP712Domain: [
                        { name: "name", type: "string" },
                        { name: "version", type: "string" },
                        { name: "chainId", type: "uint256" },
                        { name: "verifyingContract", type: "address" }
                    ],
                    MessageHash: [{ name: "hash", type: "bytes32" }]
                },
                primaryType: "MessageHash",
                message: {
                    hash: message
                },
                domain: {
                    name: "ERC1271Validator",
                    version: validatorVersion,
                    chainId: BigInt(chainId),
                    verifyingContract: validatorAddress
                }
            })
            return signature
        },
        async signTransaction(_, __) {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return viemSigner.signTypedData(typedData)
        }
    })

    return {
        ...account,
        supportedKernelVersions: kernelVersion,
        validatorType: "SECONDARY",
        address: validatorAddress,
        source: "ERC1271Validator",
        getIdentifier() {
            return validatorAddress
        },

        async getEnableData() {
            return viemSigner.address
        },
        async getNonceKey(_accountAddress?: Address, customNonceKey?: bigint) {
            if (customNonceKey) {
                return customNonceKey
            }
            return 0n
        },
        // Sign a user operation
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            return account.signMessage({ message: { raw: hash } })
        },

        // Get simple dummy signature
        async getStubSignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false
        }
    }
}
