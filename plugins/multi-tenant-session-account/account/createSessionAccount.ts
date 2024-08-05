import { fixSignedData } from "@zerodev/sdk"
import { DUMMY_ECDSA_SIG } from "@zerodev/sdk/constants"
import {
    type UserOperation,
    getAccountNonce,
    getUserOperationHash,
    isSmartAccountDeployed
} from "permissionless"
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
    type SmartAccountSigner,
    toSmartAccount
} from "permissionless/accounts"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
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
import { toAccount } from "viem/accounts"
import { getChainId, signMessage, signTypedData } from "viem/actions"
import { MultiTenantSessionAccountAbi } from "../abi/MultiTenantSessionAccountAbi"
import {
    DMVersionToAddressMap,
    MULTI_TENANT_SESSION_ACCOUNT_ADDRESS
} from "../constants"
import type { Delegation } from "../types"
import {
    getDelegationTupleType,
    toDelegationHash
} from "../utils/delegationManager"

export type SessionAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "multiTenantSessionAccount", transport, chain>

export type CreateSessionAccountParameters<
    entryPoint extends EntryPoint,
    TSource extends string = "custom",
    TAddress extends Address = Address
> = {
    entryPoint: entryPoint
    sessionKeyAccount: SmartAccountSigner<TSource, TAddress>
    delegations: Delegation[]
    multiTenantSessionAccountAddress?: Address
    delegatorInitCode?: Hex
}

export async function createSessionAccount<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        entryPoint: entryPointAddress,
        delegations,
        sessionKeyAccount,
        multiTenantSessionAccountAddress:
            accountAddress = MULTI_TENANT_SESSION_ACCOUNT_ADDRESS,
        delegatorInitCode = "0x"
    }: CreateSessionAccountParameters<entryPoint, TSource, TAddress>
): Promise<SessionAccount<entryPoint, TTransport, TChain>> {
    const viemSigner: LocalAccount = {
        ...sessionKeyAccount,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
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
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
                client,
                {
                    account: viemSigner,
                    ...typedData
                }
            )
        }
    })
    const getInitCode = async () => {
        return "0x" as Hex
    }
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

    return {
        ...toSmartAccount({
            client,
            source: "multiTenantSessionAccount",
            entryPoint: entryPointAddress,
            address: accountAddress,
            encodeCallData: async (tx) => {
                const isBatch = Array.isArray(tx)
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
                              tx.map((arg) => {
                                  return {
                                      target: arg.to,
                                      value: arg.value,
                                      callData: arg.data
                                  }
                              })
                          ]
                      )
                    : concatHex([tx.to, toHex(tx.value, { size: 32 }), tx.data])

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
                            delegations,
                            execMode,
                            execData,
                            await getDelegatorInitCode()
                        ]
                    )
                ])
            },

            encodeDeployCallData: async (_tx) => {
                throw new Error("encodeDeployCallData not supported yet")
            },
            getDummySignature: async () => {
                const signature = fixSignedData(DUMMY_ECDSA_SIG)
                const { r, s, v, yParity } = parseSignature(signature)
                return concatHex([r, s, toHex(v ?? yParity, { size: 1 })])
            },
            async getFactory() {
                return undefined
            },
            async getFactoryData() {
                return undefined
            },
            getInitCode,
            getNonce: () => {
                const key = pad(sessionAccount.address, {
                    dir: "right",
                    size: 24
                })
                return getAccountNonce(client, {
                    sender: accountAddress,
                    entryPoint: entryPointAddress,
                    key: BigInt(key)
                })
            },
            signMessage: async () => {
                throw new Error("signMessage not supported yet")
            },
            signTransaction: () => {
                throw new SignTransactionNotSupportedBySmartAccount()
            },
            signTypedData: async () => {
                throw new Error("signTypedData not supported yet")
            },
            signUserOperation: async (
                userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
            ) => {
                const hash = getUserOperationHash<entryPoint>({
                    userOperation: {
                        ...userOperation,
                        signature: "0x"
                    },
                    entryPoint: entryPointAddress,
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
}
