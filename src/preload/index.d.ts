export interface SdmApi {
  app: {
    getVersion(): Promise<string>
  }
}

declare global {
  interface Window {
    sdm: SdmApi
  }
}

export {}
