import { PaymasterAPI } from './PaymasterAPI'
import { SessionProposal, TransactionInfo } from './types'

export interface Hooks {
  transactionStarted?: (tx: TransactionInfo) => void
  transactionConfirmed?: (txHash: string) => void
  transactionReverted?: (txHash: string) => void
  walletConnectSessionProposal?: (proposal: SessionProposal) => void
}

/**
 * configuration params for wrapProvider
 */
export interface ClientConfig {
  /**
   * Needed to track gas usage
   */

  projectId: string
  /**
   * the entry point to use
   */
  entryPointAddress: string

  accountFactoryAddress: string
  /**
   * url to the bundler
   */
  bundlerUrl: string
  /**
   * if set, use this pre-deployed wallet.
   * (if not set, use getSigner().getAddress() to query the "counterfactual" address of wallet.
   *  you may need to fund this address so the wallet can pay for its own creation)
   */
  walletAddress?: string
  /**
   * if set, call just before signing.
   */
  paymasterAPI?: PaymasterAPI

  /**
   * hooks are functions invoked during the lifecycle of transactions
   */
  hooks?: Hooks
}
