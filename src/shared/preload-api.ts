import type {
  DownloadProgress,
  DownloadRequest,
  DownloadStart,
  DownloadStatus,
  MediaInfo,
  OperationResult
} from './contracts'

export type Unsubscribe = () => void

export interface SdmApi {
  media: {
    inspectUrl(requestId: string, url: string): Promise<OperationResult<MediaInfo>>
    cancelInspection(requestId: string): Promise<OperationResult<void>>
  }
  downloads: {
    chooseSavePath(
      suggestedName: string,
      extension: string
    ): Promise<OperationResult<string | null>>
    start(request: DownloadRequest): Promise<OperationResult<DownloadStart>>
    cancel(downloadId: string): Promise<OperationResult<void>>
    onProgress(callback: (progress: DownloadProgress) => void): Unsubscribe
    onStatus(callback: (status: DownloadStatus) => void): Unsubscribe
  }
  files: {
    openFile(path: string): Promise<OperationResult<void>>
    openFolder(path: string): Promise<OperationResult<void>>
  }
  app: {
    getVersion(): Promise<string>
  }
}
