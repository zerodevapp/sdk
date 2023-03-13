import AbstractJSONApiService from './AbstractJSONApiService'
import SapiApiService from './SapiApiService'

abstract class AbstractSapiService extends AbstractJSONApiService {
  protected async init (): Promise<void> {
    const sapiService = new SapiApiService()
    this.headers.Authorization = `Bearer ${await sapiService.getToken()}`
  }
}

export default AbstractSapiService
