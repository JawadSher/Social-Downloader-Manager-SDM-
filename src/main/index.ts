import { app, dialog, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { AppError } from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { parseInspectionArgs, parseNoArgs, parseRequestIdArgs } from './ipc/validators'
import { registerIpcHandler } from './ipc/register-handler'
import { checkYtDlpAvailability } from './services/media/binary-availability'
import { inspectMedia, MediaInspectionError } from './services/media/media-inspector'
import { cancelYtDlp, YtDlpProcessError } from './services/media/ytdlp-service'

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
    inspectMedia,
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
