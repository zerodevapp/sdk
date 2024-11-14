import { fixSignedData } from "@zerodev/sdk"
import { getAccountNonce, isSmartAccountDeployed } from "@zerodev/sdk/actions"
import { DUMMY_ECDSA_SIG } from "@zerodev/sdk/constants"
import type { CallType, GetEntryPointAbi } from "@zerodev/sdk/types"
import {
    type Address,
    type Assign,
    type Client,
    type Hex,
    type LocalAccount,
    type TypedData,
    type TypedDataDefinition,
    concatHex,
    encodeAbiParameters,
    getAbiItem,
    pad,
    parseSignature,
    toFunctionSelector,
    toHex
} from "viem"
import {
    type EntryPointVersion,
    type SmartAccount,
    type SmartAccountImplementation,
    type UserOperation,
    entryPoint06Abi,
    entryPoint07Abi,
    entryPoint07Address,
    getUserOperationHash,
    toSmartAccount
} from "viem/account-abstraction"
import { toAccount } from "viem/accounts"
import { getChainId, signMessage } from "viem/actions"
import { MultiTenantSessionAccountAbi } from "../abi/MultiTenantSessionAccountAbi.js"
import {
    DMVersionToAddressMap,
    MULTI_TENANT_SESSION_ACCOUNT_ADDRESS
} from "../constants.js"
import type { Delegation } from "../types.js"
import {
    getDelegationTupleType,
    toDelegationHash
} from "../utils/delegationManager.js"

export type SessionAccountImplementation<
    entryPointVersion extends EntryPointVersion = "0.7"
> = Assign<
    SmartAccountImplementation<
        GetEntryPointAbi<entryPointVersion>,
        entryPointVersion
    >,
    {
        sign: NonNullable<SmartAccountImplementation["sign"]>
        delegations: Delegation[]
        encodeCalls: (
            calls: Parameters<SmartAccountImplementation["encodeCalls"]>[0],
            callType?: CallType | undefined,
            _delegations?: Delegation[]
        ) => Promise<Hex>
    }
>

export type CreateSessionAccountParameters<
    entryPointVersion extends EntryPointVersion = "0.7"
> = {
    entryPoint: { address: Address; version: entryPointVersion }
    sessionKeySigner: LocalAccount
    delegations: Delegation[]
    multiTenantSessionAccountAddress?: Address
    delegatorInitCode?: Hex
}

export type CreateSessionAccountReturnType<
    entryPointVersion extends EntryPointVersion = "0.7"
> = SmartAccount<SessionAccountImplementation<entryPointVersion>>

export type SessionAccountEncodeCallDataArgs =
    | {
          to: Address
          value: bigint
          data: Hex
      }
    | {
          to: Address
          value: bigint
          data: Hex
      }[]

export async function createSessionAccount<
    entryPointVersion extends EntryPointVersion
>(
    client: Client,
    {
        entryPoint,
        delegations,
        sessionKeySigner,
        multiTenantSessionAccountAddress:
            accountAddress = MULTI_TENANT_SESSION_ACCOUNT_ADDRESS,
        delegatorInitCode = "0x"
    }: CreateSessionAccountParameters<entryPointVersion>
): Promise<CreateSessionAccountReturnType<entryPointVersion>> {
    const viemSigner: LocalAccount = {
        ...sessionKeySigner,
        signTransaction: (_, __) => {
            throw new Error(
                "Smart account signer doesn't need to sign transactions"
            )
        }
    } as LocalAccount

    const chainId = await getChainId(client)

    // Build the EOA Signer
    const sessionAccount = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message })
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
    const getDelegations = async () => {
        delegations.unshift({
            delegate: accountAddress,
            delegator: sessionAccount.address,
            authority: toDelegationHash(delegations[0]),
            caveats: [],
            salt: 0n,
            signature: "0x"
        })

        delegations[0].signature = await sessionAccount.signTypedData({
            domain: {
                chainId,
                name: "DelegationManager",
                verifyingContract:
                    DMVersionToAddressMap["1.0.0"].delegationManagerAddress,
                version: "1"
            },
            types: {
                Delegation: [
                    {
                        name: "delegate",
                        type: "address"
                    },
                    {
                        name: "delegator",
                        type: "address"
                    },
                    {
                        name: "authority",
                        type: "bytes32"
                    },
                    {
                        name: "caveats",
                        type: "Caveat[]"
                    },
                    {
                        name: "salt",
                        type: "uint256"
                    }
                ],
                Caveat: [
                    { name: "enforcer", type: "address" },
                    { name: "terms", type: "bytes" }
                ]
            },
            primaryType: "Delegation",
            message: {
                delegate: delegations[0].delegate,
                delegator: delegations[0].delegator,
                authority: delegations[0].authority,
                caveats: delegations[0].caveats.filter((c) => ({
                    enforcer: c.enforcer,
                    terms: c.terms
                })),
                salt: delegations[0].salt
            }
        })
        return delegations
    }

    delegations = await getDelegations()

    let delegatorAccountDeployed = await isSmartAccountDeployed(
        client,
        delegations[delegations.length - 1].delegator
    )

    const getDelegatorInitCode = async (): Promise<Hex> => {
        if (delegatorAccountDeployed) return "0x"

        delegatorAccountDeployed = await isSmartAccountDeployed(
            client,
            delegations[delegations.length - 1].delegator
        )

        if (delegatorAccountDeployed) return "0x"
        return delegatorInitCode
    }

    const _entryPoint = {
        address: entryPoint?.address ?? entryPoint07Address,
        abi: ((entryPoint?.version ?? "0.7") === "0.6"
            ? entryPoint06Abi
            : entryPoint07Abi) as GetEntryPointAbi<entryPointVersion>,
        version: entryPoint?.version ?? "0.7"
    } as const

    return toSmartAccount<SessionAccountImplementation<entryPointVersion>>({
        client,
        entryPoint: _entryPoint,
        delegations,
        async getAddress() {
            return accountAddress
        },
        async encodeCalls(calls, _callType, _delegations) {
            const isBatch = calls.length > 1

            const call = calls.length === 0 ? undefined : calls[0]

            if (!call) {
                throw new Error("No calls to encode")
            }

            const executeUserOpSig = toFunctionSelector(
                getAbiItem({
                    abi: MultiTenantSessionAccountAbi,
                    name: "executeUserOp"
                })
            )

            const execMode = concatHex([
                isBatch ? "0x01" : "0x00", // 1 byte
                "0x00", // 1 byte
                "0x00000000", // 4 bytes
                "0x00000000", // 4 bytes
                pad("0x00000000", { size: 22 })
            ])
            const execData = isBatch
                ? encodeAbiParameters(
                      [
                          {
                              name: "executionBatch",
                              type: "tuple[]",
                              components: [
                                  {
                                      name: "target",
                                      type: "address"
                                  },
                                  {
                                      name: "value",
                                      type: "uint256"
                                  },
                                  {
                                      name: "callData",
                                      type: "bytes"
                                  }
                              ]
                          }
                      ],
                      [
                          calls.map((arg) => {
                              return {
                                  target: arg.to,
                                  value: arg.value || 0n,
                                  callData: arg.data || "0x"
                              }
                          })
                      ]
                  )
                : concatHex([
                      call.to,
                      toHex(call.value || 0n, { size: 32 }),
                      call.data || "0x"
                  ])

            return concatHex([
                executeUserOpSig,
                encodeAbiParameters(
                    [
                        getDelegationTupleType(true),
                        {
                            type: "bytes32",
                            name: "execMode"
                        },
                        {
                            type: "bytes",
                            name: "execData"
                        },
                        {
                            type: "bytes",
                            name: "delegatorInitCode"
                        }
                    ],
                    [
                        _delegations ?? delegations,
                        execMode,
                        execData,
                        await getDelegatorInitCode()
                    ]
                )
            ])
        },
        getStubSignature: async () => {
            const signature = fixSignedData(DUMMY_ECDSA_SIG)
            const { r, s, v, yParity } = parseSignature(signature)
            return concatHex([r, s, toHex(v ?? yParity, { size: 1 })])
        },
        async getFactoryArgs() {
            return {
                factory: undefined,
                factoryData: undefined
            }
        },
        getNonce: () => {
            const key = pad(sessionAccount.address, {
                dir: "right",
                size: 24
            })
            return getAccountNonce(client, {
                address: accountAddress,
                entryPointAddress: entryPoint.address,
                key: BigInt(key)
            })
        },
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        signMessage: async () => {
            throw new Error("signMessage not supported yet")
        },
        signTypedData: async () => {
            throw new Error("signTypedData not supported yet")
        },
        signUserOperation: async (userOperation) => {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                } as UserOperation<entryPointVersion>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId
            })
            const signature = fixSignedData(
                await signMessage(client, {
                    account: viemSigner,
                    message: { raw: hash }
                })
            )
            const { r, s, v, yParity } = parseSignature(signature)
            return concatHex([r, s, toHex(v ?? yParity, { size: 1 })])
        }
    })
}
