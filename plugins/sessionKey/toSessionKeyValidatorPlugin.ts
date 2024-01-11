import {
    type Abi,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    getFunctionSelector,
    isHex,
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
import { concat, concatHex, decodeFunctionData } from "viem/utils"
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
    ExecutorData,
    PermissionCore,
    SessionKeyData,
    SessionKeyPlugin,
    SessionNonces
} from "./types.js"
import {
    encodePermissionData,
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
        validatorAddress = SESSION_KEY_VALIDATOR_ADDRESS,
        executorData,
        mode = ValidatorMode.enable
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        validatorData?: SessionKeyData<TAbi, TFunctionName>
        entryPoint?: Address
        validatorAddress?: Address
        executorData?: ExecutorData
        mode?: ValidatorMode
    }
): Promise<SessionKeyPlugin<TTransport, TChain>> {
    const _executorData: Required<ExecutorData> = {
        executor: executorData?.executor ?? zeroAddress,
        selector:
            executorData?.selector ??
            getFunctionSelector("execute(address, uint256, bytes, uint8)"),
        validAfter: executorData?.validAfter ?? 0,
        validUntil: executorData?.validUntil ?? 0
    }
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

    const getPluginEnableStatus = async (
        kernelAccountAddress: Address,
        selector: Hex = _executorData.selector
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

    const getValidatorSignature = async (
        accountAddress: Address,
        pluginEnableSignature?: Hex
    ): Promise<Hex> => {
        const isPluginEnabled = await getPluginEnableStatus(accountAddress)
        mode = isPluginEnabled ? ValidatorMode.plugin : ValidatorMode.enable
        if (mode === ValidatorMode.plugin) {
            return mode
        }
        const enableData = await getEnableData(accountAddress)
        const enableDataLength = enableData.length / 2 - 1
        const enableSignature = pluginEnableSignature
        if (!enableSignature) {
            throw new Error("Enable signature not set")
        }
        return concat([
            mode, // 4 bytes 0 - 4
            pad(toHex(_executorData.validUntil), { size: 6 }), // 6 bytes 4 - 10
            pad(toHex(_executorData.validAfter), { size: 6 }), // 6 bytes 10 - 16
            pad(validatorAddress, { size: 20 }), // 20 bytes 16 - 36
            pad(_executorData.executor, { size: 20 }), // 20 bytes 36 - 56
            pad(toHex(enableDataLength), { size: 32 }), // 32 bytes 56 - 88
            enableData, // 88 - 88 + enableData.length
            pad(toHex(enableSignature.length / 2 - 1), { size: 32 }), // 32 bytes 88 + enableData.length - 120 + enableData.length
            enableSignature // 120 + enableData.length - 120 + enableData.length + enableSignature.length
        ])
    }

    const findMatchingPermissions = (
        callData: Hex
    ): PermissionCore | PermissionCore[] | undefined => {
        try {
            const { functionName, args } = decodeFunctionData({
                abi: KernelAccountAbi,
                data: callData
            })

            if (functionName !== "execute" && functionName !== "executeBatch")
                return undefined
            if (functionName === "execute") {
                const [to, value, data] = args
                return filterPermissions([to], [data], [value])?.[0]
            } else if (functionName === "executeBatch") {
                const targets: Hex[] = []
                const values: bigint[] = []
                const dataArray: Hex[] = []
                for (const arg of args[0]) {
                    targets.push(arg.to)
                    values.push(arg.value)
                    dataArray.push(arg.data)
                }
                return filterPermissions(targets, dataArray, values)
            }
            throw Error("Invalid function")
        } catch (error) {
            return undefined
        }
    }

    const filterPermissions = (
        targets: Address[],
        dataArray: Hex[],
        values: bigint[]
    ): PermissionCore[] | undefined => {
        if (
            targets.length !== dataArray.length ||
            targets.length !== values.length
        ) {
            throw Error("Invalid arguments")
        }
        const filteredPermissions = targets.map((target, index) => {
            const permissionsList = sessionKeyData?.permissions
            if (!permissionsList || !permissionsList.length) return undefined

            const targetToMatch = target.toLowerCase()

            // Filter permissions by target
            const targetPermissions = permissionsList.filter(
                (permission) =>
                    permission.target.toLowerCase() === targetToMatch ||
                    permission.target.toLowerCase() ===
                        zeroAddress.toLowerCase()
            )

            if (!targetPermissions.length) return undefined

            const operationPermissions = filterByOperation(
                targetPermissions,
                // [TODO]: Check if we need to pass operation from userOp after Kernel v2.3 in
                Operation.Call
            )

            if (!operationPermissions.length) return undefined

            const signaturePermissions = filterBySignature(
                targetPermissions,
                dataArray[index].slice(0, 10).toLowerCase()
            )

            const valueLimitPermissions = signaturePermissions.filter(
                (permission) => (permission.valueLimit ?? 0n) >= values[index]
            )

            if (!valueLimitPermissions.length) return undefined

            const sortedPermissions = valueLimitPermissions.sort((a, b) => {
                if ((b.valueLimit ?? 0n) > (a.valueLimit ?? 0n)) {
                    return 1
                } else if ((b.valueLimit ?? 0n) < (a.valueLimit ?? 0n)) {
                    return -1
                } else {
                    return 0
                }
            })

            return findPermissionByRule(sortedPermissions, dataArray[index])
        })
        return filteredPermissions.every(
            (permission) => permission !== undefined
        )
            ? (filteredPermissions as PermissionCore[])
            : undefined
    }

    const filterByOperation = (
        permissions: PermissionCore[],
        operation: Operation
    ): PermissionCore[] => {
        return permissions.filter(
            (permission) =>
                permission.operation === operation ||
                Operation.Call === operation
        )
    }

    const filterBySignature = (
        permissions: PermissionCore[],
        signature: string
    ): PermissionCore[] => {
        return permissions.filter(
            (permission) =>
                (permission.sig ?? pad("0x", { size: 4 })).toLowerCase() ===
                signature
        )
    }

    const findPermissionByRule = (
        permissions: PermissionCore[],
        data: string
    ): PermissionCore | undefined => {
        return permissions.find((permission) => {
            for (const rule of permission.rules ?? []) {
                const dataParam: Hex = getFormattedHex(
                    `0x${data.slice(
                        10 + rule.offset * 2,
                        10 + rule.offset * 2 + 64
                    )}`
                )
                const ruleParam: Hex = getFormattedHex(rule.param)

                if (
                    !evaluateRuleCondition(dataParam, ruleParam, rule.condition)
                ) {
                    return false
                }
            }
            return true
        })
    }

    const getFormattedHex = (value: string): Hex => {
        return pad(isHex(value) ? value : toHex(value), {
            size: 32
        }).toLowerCase() as Hex
    }

    const evaluateRuleCondition = (
        dataParam: Hex,
        ruleParam: Hex,
        condition: ParamOperator
    ): boolean => {
        switch (condition) {
            case ParamOperator.EQUAL:
                return dataParam === ruleParam
            case ParamOperator.GREATER_THAN:
                return dataParam > ruleParam
            case ParamOperator.LESS_THAN:
                return dataParam < ruleParam
            case ParamOperator.GREATER_THAN_OR_EQUAL:
                return dataParam >= ruleParam
            case ParamOperator.LESS_THAN_OR_EQUAL:
                return dataParam <= ruleParam
            case ParamOperator.NOT_EQUAL:
                return dataParam !== ruleParam
            default:
                return false
        }
    }

    const getEncodedPermissionProofData = (callData: Hex): Hex => {
        const matchingPermission = findMatchingPermissions(callData)
        // [TODO]: add shouldDelegateViaFallback() check
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

    // const merkleRoot = merkleTree.getHexRoot();
    return {
        ...account,
        address: validatorAddress,
        signer: viemSigner,
        client: client,
        entryPoint: entryPoint,
        merkleTree,
        source: "SessionKeyValidator",
        getEnableData,

        signUserOperation: async (
            userOperation,
            pluginEnableSignature
        ): Promise<Hex> => {
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
                await getValidatorSignature(
                    userOperation.sender,
                    pluginEnableSignature
                ),
                signer.address,
                fixedSignature,
                getEncodedPermissionProofData(userOperation.callData)
            ])
        },

        getNonceKey: async () => {
            return 0n
        },

        async getDummySignature(userOperation, pluginEnableSignature) {
            return concat([
                await getValidatorSignature(
                    userOperation.sender,
                    pluginEnableSignature
                ),
                signer.address,
                constants.DUMMY_ECDSA_SIG,
                getEncodedPermissionProofData(userOperation.callData)
            ])
        },
        getPluginEnableSignature: async () => {
            throw new Error("Not implemented")
        },
        getExecutorData: () => {
            if (!_executorData?.selector || !_executorData?.executor) {
                throw new Error("Invalid executor data")
            }
            return _executorData
        },
        exportSessionKeyParams: () => {
            return {
                executorData: _executorData,
                sessionKeyData: sessionKeyData as SessionKeyData<Abi, string>
            }
        },
        shouldDelegateViaFallback: () => {
            return merkleTree.getHexRoot() === pad("0x00", { size: 32 })
        }
    }
}
