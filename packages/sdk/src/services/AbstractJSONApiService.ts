import AbstractApiService from './AbstractApiService'

abstract class AbstractJSONApiService extends AbstractApiService {
  constructor (headers?: ConstructorParameters<typeof AbstractApiService>[0]) {
    super({
      'Content-Type': 'application/json',
      ...headers
    })
  }

  protected async request (url: string, method: string, params?: { [k: string]: string }, body?: { [k: string]: any}): Promise<Response> {
    return await super.request(
      url,
      method,
      params,
      JSON.stringify(body)
    )
  }
}

export default AbstractJSONApiService
