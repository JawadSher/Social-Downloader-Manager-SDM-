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
