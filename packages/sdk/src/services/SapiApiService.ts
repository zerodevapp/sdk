import AbstractJSONApiService from './AbstractJSONApiService'

class SapiApiService extends AbstractJSONApiService {
  baseUrl: string = 'https://api.usesapi.com'

  async getToken (): Promise<string> {
    const response = await this.request(
      '/v1/token',
      'POST',
      {
        aid: '80101891-7606-410e-898b-c83a9df2b6e0'
      },
      {
        tokenOwner: 'MoralisSapi',
        metadata: { platformName: 'Browser' }
      }
    )
    const data = await response.json()
    return data.token
  }
}

export default SapiApiService
