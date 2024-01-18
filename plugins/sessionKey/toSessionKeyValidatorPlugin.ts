import {
    type Abi,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    keccak256,
    pad,
    toHex,
    zeroAddress
} from "viem"
import { toAccount } from "viem/accounts"
import {
    getChainId,
    readContract,
    signMessage,
    signTypedData
} from "viem/actions"
import { concat, concatHex } from "viem/utils"
import { SessionKeyValidatorAbi } from "./abi/SessionKeyValidatorAbi.js"

import { KernelAccountAbi } from "@kerneljs/core"
import { KERNEL_ADDRESSES } from "@kerneljs/core"
import { constants } from "@kerneljs/core"
import { ValidatorMode } from "@kerneljs/core/types"
import { MerkleTree } from "merkletreejs"
import { getAction, getUserOperationHash } from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner
} from "permissionless/accounts"
import { SESSION_KEY_VALIDATOR_ADDRESS } from "./index.js"
import type {
    SessionKeyData,
    SessionKeyPlugin,
    SessionNonces
} from "./types.js"
import {
    encodePermissionData,
    findMatchingPermissions,
    fixSignedData,
    getPermissionFromABI
} from "./utils.js"

export enum Operation {
    Call = 0,
    DelegateCall = 1
}

export enum ParamOperator {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5
}

export const anyPaymaster = "0x0000000000000000000000000000000000000001"

export async function signerToSessionKeyValidator<
    TAbi extends Abi | readonly unknown[],
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address,
    TFunctionName extends string | undefined = string
>(
    client: Client<TTransport, TChain>,
    {
        signer,
        entryPoint = KERNEL_ADDRESSES.ENTRYPOINT_V0_6,
        validatorData,
        validatorAddress = SESSION_KEY_VALIDATOR_ADDRESS
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        validatorData?: SessionKeyData<TAbi, TFunctionName>
        entryPoint?: Address
        validatorAddress?: Address
    }
): Promise<SessionKeyPlugin> {
    const sessionKeyData: SessionKeyData<TAbi, TFunctionName> = {
        ...validatorData,
        validAfter: validatorData?.validAfter ?? 0,
        validUntil: validatorData?.validUntil ?? 0,
        paymaster: validatorData?.paymaster ?? zeroAddress
    }
    const generatedPermissionParams = validatorData?.permissions?.map((perm) =>
        getPermissionFromABI({
            abi: perm.abi as Abi,
            functionName: perm.functionName as string,
            args: perm.args as []
        })
    )
    sessionKeyData.permissions =
        sessionKeyData.permissions?.map((perm, index) => ({
            ...perm,
            valueLimit: perm.valueLimit ?? 0n,
            sig:
                perm.sig ??
                generatedPermissionParams?.[index]?.sig ??
                pad("0x", { size: 4 }),
            rules:
                perm.rules ?? generatedPermissionParams?.[index]?.rules ?? [],
            index,
            executionRule: perm.executionRule ?? {
                validAfter: 0,
                interval: 0,
                runs: 0
            },
            operation: perm.operation ?? Operation.Call
        })) ?? []
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
        }
    } as LocalAccount

    // // Fetch chain id
    const [chainId] = await Promise.all([getChainId(client)])

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message })
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData(typedData) {
            return signTypedData(client, { account: viemSigner, ...typedData })
        }
    })

    const encodedPermissionData = sessionKeyData.permissions.map((permission) =>
        encodePermissionData(permission)
    )

    if (encodedPermissionData.length && encodedPermissionData.length === 1)
        encodedPermissionData.push(encodedPermissionData[0])

    const merkleTree: MerkleTree = sessionKeyData.permissions?.length
        ? new MerkleTree(encodedPermissionData, keccak256, {
              sortPairs: true,
              hashLeaves: true
          })
        : new MerkleTree([pad("0x00", { size: 32 })], keccak256, {
              hashLeaves: false,
              complete: true
          })

    const getEnableData = async (
        kernelAccountAddress?: Address,
        enabledLastNonce?: bigint
    ): Promise<Hex> => {
        if (!kernelAccountAddress) {
            throw new Error("Kernel account address not provided")
        }
        const lastNonce =
            enabledLastNonce ??
            (await getSessionNonces(kernelAccountAddress)).lastNonce + 1n
        return concat([
            signer.address,
            pad(merkleTree.getHexRoot() as Hex, { size: 32 }),
            pad(toHex(sessionKeyData?.validAfter ?? 0), {
                size: 6
            }),
            pad(toHex(sessionKeyData?.validUntil ?? 0), {
                size: 6
            }),
            sessionKeyData?.paymaster ?? zeroAddress,
            pad(toHex(lastNonce), { size: 32 })
        ])
    }

    const getSessionNonces = async (
        kernelAccountAddress: Address
    ): Promise<SessionNonces> => {
        const nonce = await getAction(
            client,
            readContract
        )({
            abi: SessionKeyValidatorAbi,
            address: validatorAddress,
            functionName: "nonces",
            args: [kernelAccountAddress]
        })

        return { lastNonce: nonce[0], invalidNonce: nonce[1] }
    }

    const isPluginEnabled = async (
        kernelAccountAddress: Address,
        selector: Hex
    ): Promise<boolean> => {
        try {
            const execDetail = await getAction(
                client,
                readContract
            )({
                abi: KernelAccountAbi,
                address: kernelAccountAddress,
                functionName: "getExecution",
                args: [selector]
            })
            const enableData = await getAction(
                client,
                readContract
            )({
                abi: SessionKeyValidatorAbi,
                address: validatorAddress,
                functionName: "sessionData",
                args: [signer.address, kernelAccountAddress]
            })
            const enableDataHex = concatHex([
                signer.address,
                pad(enableData[0], { size: 32 }),
                pad(toHex(enableData[1]), { size: 6 }),
                pad(toHex(enableData[2]), { size: 6 }),
                enableData[3],
                pad(toHex(enableData[4]), { size: 32 })
            ])
            return (
                execDetail.validator.toLowerCase() ===
                    validatorAddress.toLowerCase() &&
                enableData[4] !== 0n &&
                enableDataHex.toLowerCase() ===
                    (
                        await getEnableData(kernelAccountAddress, enableData[4])
                    ).toLowerCase()
            )
        } catch (error) {
            return false
        }
    }

    const getEncodedPermissionProofData = (callData: Hex): Hex => {
        const matchingPermission = findMatchingPermissions(
            callData,
            sessionKeyData?.permissions
        )
        if (
            !matchingPermission &&
            !(merkleTree.getHexRoot() === pad("0x00", { size: 32 }))
        ) {
            throw Error(
                "SessionKeyValidator: No matching permission found for the userOp"
            )
        }
        const encodedPermissionData =
            sessionKeyData?.permissions &&
            sessionKeyData.permissions.length !== 0 &&
            matchingPermission
                ? encodePermissionData(matchingPermission)
                : "0x"
        let merkleProof: string[] | string[][] = []
        if (Array.isArray(matchingPermission)) {
            const encodedPerms = matchingPermission.map((permission) =>
                keccak256(encodePermissionData(permission))
            )
            merkleProof = encodedPerms.map((perm) =>
                merkleTree.getHexProof(perm)
            )
        } else if (matchingPermission) {
            merkleProof = merkleTree.getHexProof(
                keccak256(encodedPermissionData)
            )
        }
        return sessionKeyData?.permissions &&
            sessionKeyData.permissions.length !== 0 &&
            matchingPermission
            ? encodePermissionData(matchingPermission, merkleProof)
            : "0x"
    }

    return {
        ...account,
        address: validatorAddress,
        source: "SessionKeyValidator",
        getEnableData,

        signUserOperation: async (userOperation): Promise<Hex> => {
            const userOpHash = getUserOperationHash({
                userOperation: { ...userOperation, signature: "0x" },
                entryPoint,
                chainId: chainId
            })

            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: userOpHash }
            })
            const fixedSignature = fixSignedData(signature)
            return concat([
                signer.address,
                fixedSignature,
                getEncodedPermissionProofData(userOperation.callData)
            ])
        },

        getNonceKey: async () => {
            return BigInt(signer.address)
        },

        async getDummySignature(userOperation) {
            return concat([
                signer.address,
                constants.DUMMY_ECDSA_SIG,
                getEncodedPermissionProofData(userOperation.callData)
            ])
        },
        getPluginSerializationParams: (): SessionKeyData<Abi, string> =>
            sessionKeyData as SessionKeyData<Abi, string>,
        getValidatorMode: async (accountAddress, selector) => {
            return (await isPluginEnabled(accountAddress, selector))
                ? ValidatorMode.plugin
                : ValidatorMode.enable
        }
    }
}
