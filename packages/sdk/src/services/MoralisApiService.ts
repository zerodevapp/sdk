import { BigNumberish } from 'ethers'
import { AssetTransfer, AssetType } from '../ZeroDevSigner'
import AbstractSapiService from './AbstractSapiService'

const MORALIS_CHAIN_ID: {[k: number]: string} = {
  80001: 'mumbai'
}

class MoralisApiService extends AbstractSapiService {
  baseUrl: string = 'https://deep--index-moralis-io-0g2wxl.proxy.usesapi.com'
  static singleton: MoralisApiService

  constructor (headers?: ConstructorParameters<typeof AbstractSapiService>[0]) {
    super(headers)
    if (MoralisApiService.singleton !== undefined) MoralisApiService.singleton = this
    return MoralisApiService.singleton
  }

  convertChainIdToMoralisChainId (chainId: number): string | undefined {
    if (MORALIS_CHAIN_ID[chainId] !== undefined) return MORALIS_CHAIN_ID[chainId]
  }

  async getNativeBalance (chainId: number, address: string): Promise<AssetTransfer | undefined> {
    const moralisChainid = this.convertChainIdToMoralisChainId(chainId)
    if (moralisChainid !== undefined) {
      const response = await this.request(
        `/api/v2/${address}/balance`,
        'GET',
        {
          chain: moralisChainid
        }
      )
      const data = await response.json()
      return {
        assetType: AssetType.ETH,
        amount: data.balance
      }
    }
  }

  async getTokenBalances (chainId: number, address: string): Promise<AssetTransfer[] | undefined> {
    const moralisChainid = this.convertChainIdToMoralisChainId(chainId)
    if (moralisChainid !== undefined) {
      const response = await this.request(
        `/api/v2/${address}/erc20`,
        'GET',
        {
          chain: moralisChainid
        }
      )
      const data = await response.json() as Array<{token_address: string, balance: BigNumberish}>
      return data.map(token => ({
        assetType: AssetType.ERC20,
        address: token.token_address,
        amount: token.balance
      }))
    }
  }

  async getNFTBalances (chainId: number, address: string): Promise<AssetTransfer[] | undefined> {
    const moralisChainid = this.convertChainIdToMoralisChainId(chainId)
    if (moralisChainid !== undefined) {
      const response = await this.request(
        `/api/v2/${address}/nft`,
        'GET',
        {
          chain: moralisChainid
        }
      )
      const data = await response.json()
      if (data.result !== undefined) {
        const result = data.result as Array<{token_address: string, token_id: string, amount: BigNumberish, contract_type: 'ERC721' | 'ERC1155'}>
        return result.map(nft => ({
          assetType: AssetType[nft.contract_type],
          tokenId: nft.token_id,
          address: nft.token_address,
          amount: nft.amount
        }))
      }
    }
  }
}

export default MoralisApiService
