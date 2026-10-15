import { contextBridge, ipcRenderer } from 'electron'
import type { DownloadProgress, DownloadStatus, OperationResult } from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { SdmApi } from '../shared/preload-api'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  if (typeof callback !== 'function') {
    throw new TypeError('An event callback is required.')
  }

  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => {
    callback(payload)
  }

  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const sdmApi: SdmApi = {
  media: {
    inspectUrl: (requestId: string, url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.mediaInspectUrl, requestId, url),
    cancelInspection: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.mediaCancelInspection, requestId)
  },
  downloads: {
    chooseSavePath: (suggestedName: string, extension: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.downloadsChooseSavePath, suggestedName, extension),
    start: (request) => ipcRenderer.invoke(IPC_CHANNELS.downloadsStart, request),
    cancel: (downloadId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.downloadsCancel, downloadId),
    onProgress: (callback: (progress: DownloadProgress) => void) =>
      subscribe(IPC_CHANNELS.downloadsProgress, callback),
    onStatus: (callback: (status: DownloadStatus) => void) =>
      subscribe(IPC_CHANNELS.downloadsStatus, callback)
  },
  files: {
    openFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.filesOpenFile, path),
    openFolder: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.filesOpenFolder, path)
  },
  app: {
    getVersion: (): Promise<OperationResult<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.appGetVersion)
  }
}

contextBridge.exposeInMainWorld('sdm', sdmApi)
