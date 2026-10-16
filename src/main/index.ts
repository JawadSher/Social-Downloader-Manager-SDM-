import { app, dialog, shell, BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { AppError, DownloadRequest, DownloadStatus, MediaFormat } from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import {
  parseInspectionArgs,
  parseNoArgs,
  parseRequestIdArgs,
  parseSaveDialogArgs,
  parseDownloadStartArgs,
  validateDownloadRequest,
  validateSelectedSavePath
} from './ipc/validators'
import { registerIpcHandler } from './ipc/register-handler'
import { checkYtDlpAvailability } from './services/media/binary-availability'
import { inspectMedia, MediaInspectionError } from './services/media/media-inspector'
import { cancelYtDlp, YtDlpProcessError } from './services/media/ytdlp-service'
import {
  DownloadRunnerError,
  runAudioOnlyDownload,
  runVideoAudioDownload,
  runVideoOnlyDownload
} from './services/downloads/download-runner'

let latestInspection: { url: string; formats: MediaFormat[] } | null = null
let authorizedOutputPath: string | null = null
let activeDownloadId: string | null = null

class DownloadRequestError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.message)
    this.name = 'DownloadRequestError'
  }
}

function publishDownloadStatus(status: DownloadStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.downloadsStatus, status)
    }
  }
}

function mapDownloadError(error: unknown): AppError {
  if (error instanceof DownloadRequestError) return error.appError
  if (error instanceof DownloadRunnerError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.code !== 'format-unavailable'
    }
  }
  if (error instanceof YtDlpProcessError) {
    return {
      code: error.code === 'timeout' ? 'network-error' : 'download-failed',
      message: error.code === 'timeout'
        ? 'The download timed out. Check your connection and try again.'
        : 'The media download failed. Try again.',
      retryable: true
    }
  }
  return {
    code: 'download-failed',
    message: 'The media download failed. Try again.',
    retryable: true
  }
}

function isInternalUrl(candidate: string): boolean {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (is.dev && devUrl) {
    try {
      return new URL(candidate).origin === new URL(devUrl).origin
    } catch {
      return false
    }
  }

  return candidate === pathToFileURL(join(__dirname, '../renderer/index.html')).href
}

function openExternalHttpUrl(candidate: string): void {
  try {
    const url = new URL(candidate)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      void shell.openExternal(url.href).catch(() => undefined)
    }
  } catch {
    // Ignore malformed URLs from renderer content.
  }
}

function mapInspectionError(error: unknown): AppError {
  if (error instanceof YtDlpProcessError) {
    if (error.code === 'cancelled') {
      return { code: 'cancelled', message: 'Media inspection was cancelled.', retryable: false }
    }
    if (error.code === 'timeout') {
      return {
        code: 'network-error',
        message: 'Media inspection timed out. Check your connection and try again.',
        retryable: true
      }
    }
    if (error.code === 'spawn-failed') {
      return {
        code: 'internal-error',
        message: 'yt-dlp could not be started. Restart the app and try again.',
        retryable: true
      }
    }
    if (error.code === 'process-failed') {
      const diagnostic = error.diagnostic?.toLowerCase() ?? ''

      if (/unsupported url|no suitable extractor|no extractor found/.test(diagnostic)) {
        return {
          code: 'unsupported-url',
          message: 'This link format is not supported by yt-dlp.',
          retryable: false
        }
      }
      if (/sign in|login required|authentication|cookies required|members.only/.test(diagnostic)) {
        return {
          code: 'authentication-required',
          message: 'This media requires sign-in or authentication that is not configured.',
          retryable: false
        }
      }
      if (/requested format.*not available|no video formats|no formats found/.test(diagnostic)) {
        return {
          code: 'format-unavailable',
          message: 'No downloadable formats were reported for this media.',
          retryable: false
        }
      }
      if (/private|video unavailable|has been removed|not available in your country|geo.?restricted/.test(diagnostic)) {
        return {
          code: 'media-unavailable',
          message: 'This media is private, unavailable, or restricted in your region.',
          retryable: false
        }
      }
      if (/unable to download|timed? out|connection|temporary failure|name or service not known|network|http error (429|5\d\d)/.test(diagnostic)) {
        return {
          code: 'network-error',
          message: 'A network error interrupted inspection. Check your connection and try again.',
          retryable: true
        }
      }
    }
  }

  if (error instanceof MediaInspectionError) {
    return {
      code: 'media-inspection-failed',
      message: 'yt-dlp returned media information the app could not read.',
      retryable: true
    }
  }

  return {
    code: 'media-inspection-failed',
    message: 'This link could not be inspected. Check that it is accessible and try again.',
    retryable: true
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalHttpUrl(url)
    return { action: 'deny' }
  })

  const preventUntrustedNavigation = (event: Electron.Event, url: string): void => {
    if (!isInternalUrl(url)) event.preventDefault()
  }
  mainWindow.webContents.on('will-navigate', preventUntrustedNavigation)
  mainWindow.webContents.on('will-redirect', preventUntrustedNavigation)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.sdm.social-downloader-manager')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const ytDlp = await checkYtDlpAvailability()
  if (!ytDlp.available) {
    const reason =
      ytDlp.error === 'not-found'
        ? 'The executable was not found.'
        : ytDlp.error === 'not-a-file'
          ? 'The configured path is not a file.'
          : 'The executable could not return its version.'

    await dialog.showMessageBox({
      type: 'warning',
      title: 'yt-dlp is unavailable',
      message: 'Media inspection and downloads require yt-dlp.exe.',
      detail: `${reason}\nExpected location:\n${ytDlp.path}`
    })
  }

  registerIpcHandler(
    IPC_CHANNELS.appGetVersion,
    (event) => event.senderFrame === event.sender.mainFrame && isInternalUrl(event.senderFrame.url),
    parseNoArgs,
    () => app.getVersion()
  )
  registerIpcHandler(
    IPC_CHANNELS.mediaInspectUrl,
    (event) => event.senderFrame === event.sender.mainFrame && isInternalUrl(event.senderFrame.url),
    parseInspectionArgs,
    async (requestId, url) => {
      latestInspection = null
      authorizedOutputPath = null
      const mediaInfo = await inspectMedia(requestId, url)
      latestInspection = { url: mediaInfo.webpageUrl, formats: mediaInfo.formats }
      return mediaInfo
    },
    mapInspectionError
  )
  registerIpcHandler(
    IPC_CHANNELS.mediaCancelInspection,
    (event) => event.senderFrame === event.sender.mainFrame && isInternalUrl(event.senderFrame.url),
    parseRequestIdArgs,
    (requestId) => {
      cancelYtDlp(requestId)
    }
  )
  registerIpcHandler(
    IPC_CHANNELS.downloadsChooseSavePath,
    (event) => event.senderFrame === event.sender.mainFrame && isInternalUrl(event.senderFrame.url),
    parseSaveDialogArgs,
    async (suggestedName, extension) => {
      const options: Electron.SaveDialogOptions = {
        title: 'Choose where to save media',
        defaultPath: join(app.getPath('downloads'), suggestedName + '.' + extension),
        filters: [{ name: extension.toUpperCase() + ' files', extensions: [extension] }],
        properties: ['showOverwriteConfirmation']
      }
      const parentWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      const result = parentWindow
        ? await dialog.showSaveDialog(parentWindow, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled) return null

      const validatedPath = validateSelectedSavePath(result.filePath, extension)
      if (!validatedPath.success) {
        throw new Error(validatedPath.error)
      }
      authorizedOutputPath = validatedPath.data
      return validatedPath.data
    },
    () => ({
      code: 'destination-error',
      message: 'The save location could not be opened or validated. Choose another location.',
      retryable: true
    })
  )
  registerIpcHandler(
    IPC_CHANNELS.downloadsStart,
    (event) => event.senderFrame === event.sender.mainFrame && isInternalUrl(event.senderFrame.url),
    parseDownloadStartArgs,
    (request: DownloadRequest) => {
      if (activeDownloadId) {
        throw new DownloadRequestError({
          code: 'invalid-input',
          message: 'A download is already in progress.',
          retryable: false
        })
      }
      if (request.outputMode !== 'video-audio' && request.outputMode !== 'audio-only' && request.outputMode !== 'video-only' && request.outputMode !== 'best-available') {
        throw new DownloadRequestError({
          code: 'format-unavailable',
          message: 'Best Available downloads are not available yet.',
          retryable: false
        })
      }
      if (!latestInspection || !authorizedOutputPath) {
        throw new DownloadRequestError({
          code: 'invalid-input',
          message: 'Inspect the media and choose a save location before downloading.',
          retryable: false
        })
      }

      const validated = validateDownloadRequest(
        request,
        latestInspection.url,
        latestInspection.formats,
        (outputPath) => outputPath.toLowerCase() === authorizedOutputPath?.toLowerCase()
      )
      if (!validated.success) {
        throw new DownloadRequestError({
          code: 'format-unavailable',
          message: validated.error,
          retryable: false
        })
      }

      const selectedFormat = latestInspection.formats.find(
        (format) => format.formatId === validated.data.formatId
      )
      if (
        !selectedFormat ||
        (request.outputMode === 'video-audio' && !selectedFormat.hasVideo) ||
        (request.outputMode === 'audio-only' &&
          (!selectedFormat.hasAudio || selectedFormat.hasVideo)) ||
        (request.outputMode === 'video-only' &&
          (!selectedFormat.hasVideo || selectedFormat.hasAudio)) ||
        (request.outputMode === 'best-available' &&
          !selectedFormat.hasVideo && !selectedFormat.hasAudio)
      ) {
        throw new DownloadRequestError({
          code: 'format-unavailable',
          message: request.outputMode === 'audio-only'
            ? 'Select an audio-only format returned for this media.'
            : request.outputMode === 'video-only'
              ? 'Select a video-only format returned for this media.'
              : request.outputMode === 'best-available'
                ? 'Select a compatible format returned for this media.'
                : 'Select a video format returned for this media.',
          retryable: false
        })
      }
      if (
        (request.outputMode === 'video-audio' ||
          (request.outputMode === 'best-available' && selectedFormat.hasVideo)) &&
        !selectedFormat.hasAudio &&
        !latestInspection.formats.some((format) => format.hasAudio && !format.hasVideo)
      ) {
        throw new DownloadRequestError({
          code: 'format-unavailable',
          message: 'This media does not provide a separate audio stream to merge.',
          retryable: false
        })
      }

      const downloadId = 'download-' + randomUUID()
      activeDownloadId = downloadId
      authorizedOutputPath = null
      publishDownloadStatus({
        downloadId,
        stage: 'preparing',
        error: null,
        result: null
      })

      const download = request.outputMode === 'audio-only' ||
        (request.outputMode === 'best-available' && !selectedFormat.hasVideo)
        ? runAudioOnlyDownload(downloadId, validated.data, selectedFormat)
        : request.outputMode === 'video-only'
          ? runVideoOnlyDownload(downloadId, validated.data, selectedFormat)
          : runVideoAudioDownload(downloadId, validated.data, selectedFormat)
      void download
        .then((result) => {
          publishDownloadStatus({
            downloadId,
            stage: 'completed',
            error: null,
            result: { downloadId, ...result }
          })
        })
        .catch((error: unknown) => {
          publishDownloadStatus({
            downloadId,
            stage: 'failed',
            error: mapDownloadError(error),
            result: null
          })
        })
        .finally(() => {
          if (activeDownloadId === downloadId) activeDownloadId = null
        })

      return { downloadId }
    },
    mapDownloadError
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
