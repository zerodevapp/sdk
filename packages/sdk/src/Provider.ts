import { JsonRpcProvider } from '@ethersproject/providers'

import { EntryPoint__factory } from '@zerodevapp/contracts'

import { ClientConfig } from './ClientConfig'
import { ZeroDevProvider } from './ZeroDevProvider'
import { HttpRpcClient } from './HttpRpcClient'
import { Signer } from '@ethersproject/abstract-signer'
import Debug from 'debug'
import { GnosisAccountAPI } from './GnosisAccountAPI'
import { ethers } from 'ethers'
import { getRpcUrl } from './utils'

const debug = Debug('aa.wrapProvider')

/**
 * wrap an existing provider to tunnel requests through Account Abstraction.
 * @param originalProvider the normal provider
 * @param config see ClientConfig for more info
 * @param originalSigner use this signer as the owner. of this wallet. By default, use the provider's signer
 */
export async function wrapProvider(
  originalProvider: JsonRpcProvider,
  config: ClientConfig,
  originalSigner: Signer = originalProvider.getSigner()
): Promise<ZeroDevProvider> {
  const entryPoint = EntryPoint__factory.connect(config.entryPointAddress, originalProvider)
  const chainId = await originalProvider.getNetwork().then(net => net.chainId)
  // Initial SimpleAccount instance is not deployed and exists just for the interface
  const accountAPI = new GnosisAccountAPI({
    // Use our own provider because some providers like Magic doesn't support custom errors, which
    // we rely on for getting counterfactual address
    // Unless it's hardhat.
    provider: chainId === 31337 ? originalProvider : new ethers.providers.JsonRpcProvider(getRpcUrl(chainId)),
    entryPointAddress: entryPoint.address,
    owner: originalSigner,
    factoryAddress: config.accountFactoryAddress,
    paymasterAPI: config.paymasterAPI,
    accountAddress: config.walletAddress
  })
  debug('config=', config)
  const httpRpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, chainId)
  return await new ZeroDevProvider(
    chainId,
    config,
    originalSigner,
    originalProvider,
    httpRpcClient,
    entryPoint,
    accountAPI,

  ).init()
}
