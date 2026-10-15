import type { SdmApi } from '../shared/preload-api'

declare global {
  interface Window {
    sdm: SdmApi
  }
}

export {}
