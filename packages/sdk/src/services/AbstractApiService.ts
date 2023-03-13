abstract class AbstractApiService {
  abstract baseUrl: string
  initiated: boolean = false
  headers: {[k: string]: string} = {}

  constructor (headers?: {[k: string]: string}) {
    if (headers !== undefined) this.headers = headers
  }

  protected async init (): Promise<void> {
    this.initiated = true
  }

  protected async request (url: string, method: string, params?: {[k: string ]: string}, body?: any): Promise<Response> {
    if (!this.initiated) await this.init()
    let queryString = new URLSearchParams(params).toString()
    if (queryString !== '') queryString = `?${queryString}`
    return (
      await fetch(
        `${this.baseUrl + url + queryString}`,
        {
          method,
          body,
          headers: this.headers
        }
      )
    )
  }
}

export default AbstractApiService
