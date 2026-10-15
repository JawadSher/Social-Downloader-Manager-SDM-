export const IPC_CHANNELS = {
  appGetVersion: 'app:get-version',
  mediaInspectUrl: 'media:inspect-url',
  mediaCancelInspection: 'media:cancel-inspection',
  downloadsChooseSavePath: 'downloads:choose-save-path',
  downloadsStart: 'downloads:start',
  downloadsCancel: 'downloads:cancel',
  downloadsProgress: 'downloads:progress',
  downloadsStatus: 'downloads:status',
  filesOpenFile: 'files:open-file',
  filesOpenFolder: 'files:open-folder'
} as const

export const INVOKE_CHANNELS = [
  IPC_CHANNELS.appGetVersion,
  IPC_CHANNELS.mediaInspectUrl,
  IPC_CHANNELS.mediaCancelInspection,
  IPC_CHANNELS.downloadsChooseSavePath,
  IPC_CHANNELS.downloadsStart,
  IPC_CHANNELS.downloadsCancel,
  IPC_CHANNELS.filesOpenFile,
  IPC_CHANNELS.filesOpenFolder
] as const

export type InvokeChannel = (typeof INVOKE_CHANNELS)[number]
