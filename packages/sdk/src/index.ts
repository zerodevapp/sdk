import '@ethersproject/shims'
import { Buffer } from 'buffer'
global.Buffer = Buffer

import { ethers, Signer } from 'ethers'

import { getRpcUrl } from './utils'
import * as api from './api'
import * as constants from './constants'
import { Hooks } from './ClientConfig'
import { VerifyingPaymasterAPI } from './paymaster'
import { ZeroDevSigner } from './ZeroDevSigner'
import { ZeroDevProvider } from './ZeroDevProvider'
import { wrapProvider } from './Provider'

export { ZeroDevSigner, AssetTransfer, AssetType } from './ZeroDevSigner'
export { ZeroDevProvider } from './ZeroDevProvider'
export { UserOperationReceipt } from './HttpRpcClient'
export { getPrivateKeyOwner, getRPCProviderOwner, getSocialWalletOwner } from './owner'

type AccountParams = {
  projectId: string
  owner: Signer
  rpcProviderUrl?: string
  bundlerUrl?: string
  factoryAddress?: string
  hooks?: Hooks
  address?: string
}

export async function getZeroDevProvider(params: AccountParams): Promise<ZeroDevProvider> {
  const chainId = await api.getChainId(params.projectId, constants.BACKEND_URL)
  const provider = new ethers.providers.JsonRpcProvider(params.rpcProviderUrl || getRpcUrl(chainId))

  const aaConfig = {
    projectId: params.projectId,
    chainId: chainId,
    entryPointAddress: constants.ENTRYPOINT_ADDRESS,
    bundlerUrl: params.bundlerUrl || constants.BUNDLER_URL[chainId],
    paymasterAPI: new VerifyingPaymasterAPI(
      params.projectId,
      constants.PAYMASTER_URL,
      chainId,
    ),
    accountFactoryAddress: params.factoryAddress || constants.ACCOUNT_FACTORY_ADDRESS,
    hooks: params.hooks,
    walletAddress: params.address
  }
  const aaProvider = await wrapProvider(provider, aaConfig, params.owner)
  return aaProvider
}

export async function getZeroDevSigner(
  params: AccountParams,
): Promise<ZeroDevSigner> {
  const aaProvider = await getZeroDevProvider(params)
  const aaSigner = aaProvider.getSigner()

  return aaSigner
}

// Check if a signer is a ZeroDevSigner
export async function isZeroDevSigner(signer: any) {
  return signer instanceof ZeroDevSigner
}

// Typecast a signer to a ZeroDevSigner, or throw if it's not a ZeroDevSigner
export function asZeroDevSigner(signer: Signer): ZeroDevSigner {
  if (!(signer instanceof ZeroDevSigner)) {
    throw new Error("not a ZeroDevSigner")
  }
  return signer as ZeroDevSigner
}