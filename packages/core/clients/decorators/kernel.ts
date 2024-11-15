import type {
    Abi,
    Chain,
    Client,
    ContractFunctionArgs,
    ContractFunctionName,
    Hash,
    Prettify,
    Transport,
    TypedData,
    WriteContractParameters
} from "viem"
import type { EntryPointVersion, SmartAccount } from "viem/account-abstraction"
import { getKernelV3ModuleCurrentNonce } from "../../actions/account-client/getKernelV3ModuleCurrentNonce.js"
import {
    type GetUserOperationGasPriceReturnType,
    getUserOperationGasPrice
} from "../../actions/account-client/getUserOperationGasPrice.js"
import {
    type InvalidateNonceParameters,
    invalidateNonce
} from "../../actions/account-client/invalidateNonce.js"
import { sendTransaction } from "../../actions/account-client/sendTransaction.js"
import { signMessage } from "../../actions/account-client/signMessage.js"
import { signTypedData } from "../../actions/account-client/signTypedData.js"
import { writeContract } from "../../actions/account-client/writeContract.js"
import type {
    ChangeSudoValidatorParameters,
    SignUserOperationReturnType,
    UninstallPluginParameters
} from "../../actions/index.js"
import {
    changeSudoValidator,
    signUserOperation,
    uninstallPlugin
} from "../../actions/index.js"
import {
    type EstimateGasInERC20Parameters,
    type EstimateGasInERC20ReturnType,
    estimateGasInERC20
} from "../../actions/paymaster/estimateGasInERC20.js"
import {
    type SponsorUserOperationParameters,
    type SponsorUserOperationReturnType,
    sponsorUserOperation
} from "../../actions/paymaster/sponsorUserOperation.js"
import type { EntryPointType } from "../../types/kernel.js"
import type { ZeroDevPaymasterClient } from "../paymasterClient.js"

export type ZeroDevPaymasterClientActions<
    entryPointVersion extends EntryPointVersion
> = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters<entryPointVersion>
    ) => Promise<SponsorUserOperationReturnType<entryPointVersion>>
    estimateGasInERC20: (
        args: EstimateGasInERC20Parameters
    ) => Promise<EstimateGasInERC20ReturnType>
}

export const zerodevPaymasterActions =
    <entryPointVersion extends EntryPointVersion>(
        entryPoint: EntryPointType<entryPointVersion>
    ) =>
    (client: Client): ZeroDevPaymasterClientActions<entryPointVersion> => ({
        sponsorUserOperation: async (
            args: Omit<
                SponsorUserOperationParameters<entryPointVersion>,
                "entryPoint"
            >
        ) =>
            sponsorUserOperation(
                client as ZeroDevPaymasterClient<entryPointVersion>,
                {
                    ...args,
                    entryPoint
                }
            ),
        estimateGasInERC20: async (args: EstimateGasInERC20Parameters) =>
            estimateGasInERC20(
                client as ZeroDevPaymasterClient<entryPointVersion>,
                args
            )
    })

export type KernelAccountClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
> = {
    /**
     * Signs a user operation with the given transport, chain, and smart account.
     *
     * @param args - Parameters for the signUserOperation function
     * @returns A promise that resolves to the result of the signUserOperation function
     */
    signUserOperation: <
        accountOverride extends SmartAccount | undefined = undefined,
        calls extends readonly unknown[] = readonly unknown[]
    >(
        args: Parameters<
            typeof signUserOperation<
                TSmartAccount,
                TChain,
                accountOverride,
                calls
            >
        >[1]
    ) => Promise<SignUserOperationReturnType>
    /**
     * Returns the live gas prices that you can use to send a user operation.
     *
     * @returns maxFeePerGas & maxPriorityFeePerGas {@link GetUserOperationGasPriceReturnType}
     */
    getUserOperationGasPrice: () => Promise<
        Prettify<GetUserOperationGasPriceReturnType>
    >
    /**
     * Creates, signs, and sends an uninstall kernel plugin transaction to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @param args - {@link UninstallPermissionParameters}
     * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash. {@link SendTransactionReturnType}
     */
    uninstallPlugin: <
        accountOverride extends SmartAccount | undefined = undefined,
        calls extends readonly unknown[] = readonly unknown[]
    >(
        args: UninstallPluginParameters<TSmartAccount, accountOverride, calls>
    ) => Promise<Hash>
    /**
     * Creates, signs, and sends a user operation to change sudo validator to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     */
    changeSudoValidator: <
        accountOverride extends SmartAccount | undefined = undefined,
        calls extends readonly unknown[] = readonly unknown[]
    >(
        args: ChangeSudoValidatorParameters<
            TSmartAccount,
            accountOverride,
            calls
        >
    ) => Promise<Hash>

    /**
     * Creates, signs, and sends a kernel v3 module nonce invalidation transaction to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @param args - {@link InvalidateNonceParameters}
     * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash. {@link SendTransactionReturnType}
     */
    invalidateNonce: <
        accountOverride extends SmartAccount | undefined = undefined,
        calls extends readonly unknown[] = readonly unknown[]
    >(
        args: InvalidateNonceParameters<TSmartAccount, accountOverride, calls>
    ) => Promise<Hash>
    /**
     * Creates, signs, and sends a transaction to fetch KernelV3 module nonce to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     *
     * @returns nonce
     */
    getKernelV3ModuleCurrentNonce: () => Promise<number>
    /**
     * Creates, signs, and sends a new transaction to the network.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     * - Docs: https://viem.sh/docs/actions/wallet/sendTransaction.html
     * - Examples: https://stackblitz.com/github/wagmi-dev/viem/tree/main/examples/transactions/sending-transactions
     * - JSON-RPC Methods:
     *   - JSON-RPC Accounts: [`eth_sendTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendtransaction)
     *   - Local Accounts: [`eth_sendRawTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendrawtransaction)
     *
     * @param args - {@link SendTransactionParameters}
     * @returns The [Transaction](https://viem.sh/docs/glossary/terms.html#transaction) hash. {@link SendTransactionReturnType}
     *
     * @example
     * import { createWalletClient, custom } from 'viem'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   chain: mainnet,
     *   transport: custom(window.ethereum),
     * })
     * const hash = await client.sendTransaction({
     *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
     *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
     *   value: 1000000000000000000n,
     * })
     *
     * @example
     * // Account Hoisting
     * import { createWalletClient, http } from 'viem'
     * import { privateKeyToAccount } from 'viem/accounts'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   account: privateKeyToAccount('0x…'),
     *   chain: mainnet,
     *   transport: http(),
     * })
     * const hash = await client.sendTransaction({
     *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
     *   value: 1000000000000000000n,
     * })
     */
    sendTransaction: <
        TChainOverride extends Chain | undefined = undefined,
        accountOverride extends SmartAccount | undefined = undefined,
        calls extends readonly unknown[] = readonly unknown[]
    >(
        args: Parameters<
            typeof sendTransaction<
                TSmartAccount,
                TChain,
                accountOverride,
                TChainOverride,
                calls
            >
        >[1]
    ) => Promise<Hash>
    /**
     * Calculates an Ethereum-specific signature in [EIP-191 format](https://eips.ethereum.org/EIPS/eip-191): `keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))`.
     *
     * - Docs: https://viem.sh/docs/actions/wallet/signMessage.html
     * - JSON-RPC Methods:
     *   - JSON-RPC Accounts: [`personal_sign`](https://docs.metamask.io/guide/signing-data.html#personal-sign)
     *   - Local Accounts: Signs locally. No JSON-RPC request.
     *
     * With the calculated signature, you can:
     * - use [`verifyMessage`](https://viem.sh/docs/utilities/verifyMessage.html) to verify the signature,
     * - use [`recoverMessageAddress`](https://viem.sh/docs/utilities/recoverMessageAddress.html) to recover the signing address from a signature.
     *
     * @param args - {@link SignMessageParameters}
     * @returns The signed message. {@link SignMessageReturnType}
     *
     * @example
     * import { createWalletClient, custom } from 'viem'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   chain: mainnet,
     *   transport: custom(window.ethereum),
     * })
     * const signature = await client.signMessage({
     *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
     *   message: 'hello world',
     * })
     *
     * @example
     * // Account Hoisting
     * import { createWalletClient, http } from 'viem'
     * import { privateKeyToAccount } from 'viem/accounts'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   account: privateKeyToAccount('0x…'),
     *   chain: mainnet,
     *   transport: http(),
     * })
     * const signature = await client.signMessage({
     *   message: 'hello world',
     * })
     */
    signMessage: (
        args: Parameters<typeof signMessage<TSmartAccount>>[1]
    ) => ReturnType<typeof signMessage<TSmartAccount>>
    /**
     * Signs typed data and calculates an Ethereum-specific signature in [EIP-191 format](https://eips.ethereum.org/EIPS/eip-191): `keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))`.
     *
     * - Docs: https://viem.sh/docs/actions/wallet/signTypedData.html
     * - JSON-RPC Methods:
     *   - JSON-RPC Accounts: [`eth_signTypedData_v4`](https://docs.metamask.io/guide/signing-data.html#signtypeddata-v4)
     *   - Local Accounts: Signs locally. No JSON-RPC request.
     *
     * @param client - Client to use
     * @param args - {@link SignTypedDataParameters}
     * @returns The signed data. {@link SignTypedDataReturnType}
     *
     * @example
     * import { createWalletClient, custom } from 'viem'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   chain: mainnet,
     *   transport: custom(window.ethereum),
     * })
     * const signature = await client.signTypedData({
     *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
     *   domain: {
     *     name: 'Ether Mail',
     *     version: '1',
     *     chainId: 1,
     *     verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
     *   },
     *   types: {
     *     Person: [
     *       { name: 'name', type: 'string' },
     *       { name: 'wallet', type: 'address' },
     *     ],
     *     Mail: [
     *       { name: 'from', type: 'Person' },
     *       { name: 'to', type: 'Person' },
     *       { name: 'contents', type: 'string' },
     *     ],
     *   },
     *   primaryType: 'Mail',
     *   message: {
     *     from: {
     *       name: 'Cow',
     *       wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
     *     },
     *     to: {
     *       name: 'Bob',
     *       wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
     *     },
     *     contents: 'Hello, Bob!',
     *   },
     * })
     *
     * @example
     * // Account Hoisting
     * import { createWalletClient, http } from 'viem'
     * import { privateKeyToAccount } from 'viem/accounts'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   account: privateKeyToAccount('0x…'),
     *   chain: mainnet,
     *   transport: http(),
     * })
     * const signature = await client.signTypedData({
     *   domain: {
     *     name: 'Ether Mail',
     *     version: '1',
     *     chainId: 1,
     *     verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
     *   },
     *   types: {
     *     Person: [
     *       { name: 'name', type: 'string' },
     *       { name: 'wallet', type: 'address' },
     *     ],
     *     Mail: [
     *       { name: 'from', type: 'Person' },
     *       { name: 'to', type: 'Person' },
     *       { name: 'contents', type: 'string' },
     *     ],
     *   },
     *   primaryType: 'Mail',
     *   message: {
     *     from: {
     *       name: 'Cow',
     *       wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
     *     },
     *     to: {
     *       name: 'Bob',
     *       wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
     *     },
     *     contents: 'Hello, Bob!',
     *   },
     * })
     */
    signTypedData: <
        const TTypedData extends TypedData | { [key: string]: unknown },
        TPrimaryType extends string
    >(
        args: Parameters<
            typeof signTypedData<TTypedData, TPrimaryType, TSmartAccount>
        >[1]
    ) => ReturnType<
        typeof signTypedData<TTypedData, TPrimaryType, TSmartAccount>
    >
    /**
     * Executes a write function on a contract.
     * This function also allows you to sponsor this transaction if sender is a smartAccount
     *
     * - Docs: https://viem.sh/docs/contract/writeContract.html
     * - Examples: https://stackblitz.com/github/wagmi-dev/viem/tree/main/examples/contracts/writing-to-contracts
     *
     * A "write" function on a Solidity contract modifies the state of the blockchain. These types of functions require gas to be executed, and hence a [Transaction](https://viem.sh/docs/glossary/terms.html) is needed to be broadcast in order to change the state.
     *
     * Internally, uses a [Wallet Client](https://viem.sh/docs/clients/wallet.html) to call the [`sendTransaction` action](https://viem.sh/docs/actions/wallet/sendTransaction.html) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData.html).
     *
     * __Warning: The `write` internally sends a transaction – it does not validate if the contract write will succeed (the contract may throw an error). It is highly recommended to [simulate the contract write with `contract.simulate`](https://viem.sh/docs/contract/writeContract.html#usage) before you execute it.__
     *
     * @param args - {@link WriteContractParameters}
     * @returns A [Transaction Hash](https://viem.sh/docs/glossary/terms.html#hash). {@link WriteContractReturnType}
     *
     * @example
     * import { createWalletClient, custom, parseAbi } from 'viem'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   chain: mainnet,
     *   transport: custom(window.ethereum),
     * })
     * const hash = await client.writeContract({
     *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
     *   abi: parseAbi(['function mint(uint32 tokenId) nonpayable']),
     *   functionName: 'mint',
     *   args: [69420],
     * })
     *
     * @example
     * // With Validation
     * import { createWalletClient, custom, parseAbi } from 'viem'
     * import { mainnet } from 'viem/chains'
     *
     * const client = createWalletClient({
     *   chain: mainnet,
     *   transport: custom(window.ethereum),
     * })
     * const { request } = await client.simulateContract({
     *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
     *   abi: parseAbi(['function mint(uint32 tokenId) nonpayable']),
     *   functionName: 'mint',
     *   args: [69420],
     * }
     * const hash = await client.writeContract(request)
     */
    writeContract: <
        const TAbi extends Abi | readonly unknown[],
        TFunctionName extends ContractFunctionName<
            TAbi,
            "nonpayable" | "payable"
        > = ContractFunctionName<TAbi, "nonpayable" | "payable">,
        TArgs extends ContractFunctionArgs<
            TAbi,
            "nonpayable" | "payable",
            TFunctionName
        > = ContractFunctionArgs<TAbi, "nonpayable" | "payable", TFunctionName>,
        TChainOverride extends Chain | undefined = undefined
    >(
        args: WriteContractParameters<
            TAbi,
            TFunctionName,
            TArgs,
            TChain,
            TSmartAccount,
            TChainOverride
        >
    ) => ReturnType<
        typeof writeContract<
            TChain,
            TSmartAccount,
            TAbi,
            TFunctionName,
            TArgs,
            TChainOverride
        >
    >
}

export function kernelAccountClientActions() {
    return <
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        client: Client<Transport, TChain, TSmartAccount>
    ): KernelAccountClientActions<TChain, TSmartAccount> => ({
        signUserOperation: (args) => signUserOperation(client, args),
        getUserOperationGasPrice: async () => getUserOperationGasPrice(client),
        uninstallPlugin: async (args) => uninstallPlugin(client, args),
        changeSudoValidator: async (args) => changeSudoValidator(client, args),
        invalidateNonce: async (args) => invalidateNonce(client, args),
        getKernelV3ModuleCurrentNonce: async () =>
            getKernelV3ModuleCurrentNonce(client),
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        sendTransaction: (args) => sendTransaction(client, args as any),
        signMessage: (args) => signMessage(client, args),
        signTypedData: (args) => signTypedData(client, args),
        writeContract: (args) => writeContract(client, args)
    })
}
