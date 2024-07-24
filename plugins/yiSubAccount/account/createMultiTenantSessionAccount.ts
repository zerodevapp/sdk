import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
    toSmartAccount,
    type SmartAccountSigner
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
    type Transport,
    type LocalAccount,
    concatHex,
    decodeAbiParameters,
    encodeAbiParameters,
    toFunctionSelector,
    getAbiItem,
    type TypedData,
    type TypedDataDefinition,
    pad,
    parseSignature,
    toHex
} from "viem"
import { toAccount } from "viem/accounts"
import {
    MAGIC_BYTES,
    MULTI_TENANT_SESSION_ACCOUNT_ADDRESS,
    ROOT_AUTHORITY,
    YiSubAccountVersionToDMMap
} from "../constants"
import type { Caveat, Delegation } from "../types"
import { MultiTenantSessionAccountAbi } from "../abi/MultiTenantSessionAccountAbi"
import {
    getDelegationTupleType,
    toDelegationHash
} from "../utils/delegationManager"
import { getChainId, signMessage, signTypedData } from "viem/actions"
import {
    type UserOperation,
    getAccountNonce,
    getUserOperationHash
} from "permissionless"
import { fixSignedData } from "@zerodev/sdk"
import { DUMMY_ECDSA_SIG } from "@zerodev/sdk/constants"

export type MultiTenantSessionAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "multiTenantSessionAccount", transport, chain>

export type CreateMultiTenantSessionAccountParameters<
    entryPoint extends EntryPoint,
    TSource extends string = "custom",
    TAddress extends Address = Address
> = {
    entryPoint: entryPoint
    sessionKeyAccount: SmartAccountSigner<TSource, TAddress>
    sessionSignature: Hex
    masterAccountAddress: Address
    subAccountAddress: Address
    caveats: Caveat[]
    accountAddress?: Address
}

export async function createMultiTenantSessionAccount<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        entryPoint: entryPointAddress,
        sessionKeyAccount,
        sessionSignature,
        masterAccountAddress,
        subAccountAddress,
        caveats,
        accountAddress = MULTI_TENANT_SESSION_ACCOUNT_ADDRESS
    }: CreateMultiTenantSessionAccountParameters<entryPoint, TSource, TAddress>
): Promise<MultiTenantSessionAccount<entryPoint, TTransport, TChain>> {
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
    // const getCallData = async (
    //     tx: Parameters<
    //         MultiTenantSessionAccount<entryPoint>["encodeCallData"]
    //     >[0]
    // ) => {
    //     if (Array.isArray(tx)) {
    //         throw new Error("Batch call not supported yet")
    //     }

    //     const executeUserOpSig = toFunctionSelector(
    //         getAbiItem({
    //             abi: MultiTenantSessionAccountAbi,
    //             name: "executeUserOp"
    //         })
    //     )
    //     const delegations: Delegation[] = []
    //     delegations[2] = {
    //         delegator: subAccountAddress,
    //         delegate: masterAccountAddress,
    //         authority: ROOT_AUTHORITY,
    //         caveats: [],
    //         salt: 0n,
    //         signature: "0x"
    //     }
    //     delegations[1] = {
    //         delegator: masterAccountAddress,
    //         delegate: sessionAccount.address,
    //         authority: toDelegationHash(delegations[2], "1.0.0", chainId),
    //         caveats: caveats,
    //         salt: 0n,
    //         signature: sessionSignature
    //     }
    //     delegations[0] = {
    //         delegator: sessionAccount.address,
    //         delegate: accountAddress,
    //         authority: toDelegationHash(delegations[1], "1.0.0", chainId),
    //         caveats: [],
    //         salt: 0n,
    //         signature: "0x"
    //     }
    //     delegations[0].signature = await sessionAccount.signTypedData({
    //         domain: {
    //             chainId,
    //             name: "DelegationManager",
    //             verifyingContract:
    //                 YiSubAccountVersionToDMMap["1.0.0"]
    //                     .delegationManagerAddress,
    //             version: "1.0.0"
    //         },
    //         types: {
    //             Delegation: [
    //                 {
    //                     name: "delegate",
    //                     type: "address"
    //                 },
    //                 {
    //                     name: "delegator",
    //                     type: "address"
    //                 },
    //                 {
    //                     name: "authority",
    //                     type: "bytes32"
    //                 },
    //                 {
    //                     name: "caveats",
    //                     type: "Caveat[]"
    //                 },
    //                 {
    //                     name: "salt",
    //                     type: "uint256"
    //                 }
    //             ],
    //             Caveat: [
    //                 { name: "address", type: "address" },
    //                 { name: "args", type: "bytes" },
    //                 { name: "args", type: "bytes" }
    //             ]
    //         },
    //         primaryType: "Delegation",
    //         message: {
    //             delegate: delegations[0].delegate,
    //             delegator: delegations[0].delegator,
    //             authority: delegations[0].authority,
    //             caveats: delegations[0].caveats,
    //             salt: delegations[0].salt
    //         }
    //     })

    //     return concatHex([
    //         executeUserOpSig,
    //         encodeAbiParameters(
    //             [
    //                 getDelegationTupleType(true),
    //                 {
    //                     type: "tuple",
    //                     name: "action",
    //                     components: [
    //                         { name: "to", type: "address" },
    //                         { name: "value", type: "uint256" },
    //                         { name: "data", type: "bytes" }
    //                     ]
    //                 }
    //             ],
    //             [delegations, tx]
    //         )
    //     ])
    // }

    return {
        ...toSmartAccount({
            client,
            source: "multiTenantSessionAccount",
            entryPoint: entryPointAddress,
            address: accountAddress,
            encodeCallData: async (tx) => {
                if (Array.isArray(tx)) {
                    throw new Error("Batch call not supported yet")
                }
                const executeUserOpSig = toFunctionSelector(
                    getAbiItem({
                        abi: MultiTenantSessionAccountAbi,
                        name: "executeUserOp"
                    })
                )
                const delegations: Delegation[] = []
                delegations[2] = {
                    delegate: masterAccountAddress,
                    delegator: subAccountAddress,
                    authority: ROOT_AUTHORITY,
                    caveats: [],
                    salt: 0n,
                    signature: "0x"
                }
                console.log("1")
                delegations[1] = {
                    delegate: sessionAccount.address,
                    delegator: masterAccountAddress,
                    authority: toDelegationHash(delegations[2]),
                    caveats: caveats,
                    salt: 0n,
                    signature: sessionSignature
                }
                console.log("0")
                delegations[0] = {
                    delegate: accountAddress,
                    delegator: sessionAccount.address,
                    authority: toDelegationHash(delegations[1]),
                    caveats: [],
                    salt: 0n,
                    signature: "0x"
                }

                delegations[0].signature = await sessionAccount.signTypedData({
                    domain: {
                        chainId,
                        name: "DelegationManager",
                        verifyingContract:
                            YiSubAccountVersionToDMMap["1.0.0"]
                                .delegationManagerAddress,
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
                            // { name: "args", type: "bytes" }
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
                console.log({
                    delegationsEncoded: encodeAbiParameters(
                        [getDelegationTupleType(true)],
                        [delegations]
                    ),
                    action: tx
                })
                console.log({ d: JSON.stringify(delegations) })

                return concatHex([
                    executeUserOpSig,
                    encodeAbiParameters(
                        [
                            getDelegationTupleType(true),
                            {
                                type: "tuple",
                                name: "action",
                                components: [
                                    { name: "to", type: "address" },
                                    { name: "value", type: "uint256" },
                                    { name: "data", type: "bytes" }
                                ]
                            }
                        ],
                        [delegations, tx]
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
            signMessage: async ({ message }) => {
                let masterSignature = await sessionAccount.signMessage({
                    message
                })

                let sig: Hex
                if (
                    masterSignature
                        .toLowerCase()
                        .includes(MAGIC_BYTES.substring(2))
                ) {
                    masterSignature = masterSignature.replace(
                        MAGIC_BYTES.substring(2),
                        ""
                    ) as Hex
                    const decodedSig = decodeAbiParameters(
                        [
                            {
                                type: "address",
                                name: "create2Factory"
                            },
                            {
                                type: "bytes",
                                name: "factoryCalldata"
                            },
                            {
                                type: "bytes",
                                name: "originalERC1271Signature"
                            }
                        ],
                        masterSignature
                    )
                    sig = decodedSig[2]
                } else {
                    sig = masterSignature
                }
                return encodeAbiParameters(
                    [
                        {
                            name: "delegation",
                            type: "tuple",
                            components: [
                                { name: "delegate", type: "address" },
                                { name: "delegator", type: "address" },
                                { name: "authority", type: "bytes32" },
                                {
                                    name: "caveats",
                                    type: "tuple[]",
                                    components: [
                                        { type: "address" },
                                        { type: "bytes" },
                                        { type: "bytes" }
                                    ]
                                },
                                { name: "salt", type: "uint256" },
                                { name: "signature", type: "bytes" }
                            ]
                        },
                        { name: "signature", type: "bytes" }
                    ],
                    [
                        {
                            delegator: accountAddress,
                            delegate: masterAccountAddress,
                            authority:
                                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                            caveats: [],
                            salt: 0n,
                            signature: "0x"
                        },
                        sig
                    ]
                )
            },
            signTransaction: () => {
                throw new SignTransactionNotSupportedBySmartAccount()
            },
            signTypedData: async (typedData) => {
                let masterSignature = await sessionAccount.signTypedData(
                    typedData
                )
                let sig: Hex
                if (
                    masterSignature
                        .toLowerCase()
                        .includes(MAGIC_BYTES.substring(2))
                ) {
                    masterSignature = masterSignature.replace(
                        MAGIC_BYTES.substring(2),
                        ""
                    ) as Hex
                    const decodedSig = decodeAbiParameters(
                        [
                            {
                                type: "address",
                                name: "create2Factory"
                            },
                            {
                                type: "bytes",
                                name: "factoryCalldata"
                            },
                            {
                                type: "bytes",
                                name: "originalERC1271Signature"
                            }
                        ],
                        masterSignature
                    )
                    sig = decodedSig[2]
                } else {
                    sig = masterSignature
                }
                return encodeAbiParameters(
                    [
                        {
                            name: "delegation",
                            type: "tuple",
                            components: [
                                { name: "delegate", type: "address" },
                                { name: "delegator", type: "address" },
                                { name: "authority", type: "bytes32" },
                                {
                                    name: "caveats",
                                    type: "tuple[]",
                                    components: [
                                        { type: "address" },
                                        { type: "bytes" },
                                        { type: "bytes" }
                                    ]
                                },
                                { name: "salt", type: "uint256" },
                                { name: "signature", type: "bytes" }
                            ]
                        },
                        { name: "signature", type: "bytes" }
                    ],
                    [
                        {
                            delegator: accountAddress,
                            delegate: masterAccountAddress,
                            authority:
                                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                            caveats: [],
                            salt: 0n,
                            signature: "0x"
                        },
                        sig
                    ]
                )
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
