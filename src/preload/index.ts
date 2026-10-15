import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('sdm', {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version')
  }
})
