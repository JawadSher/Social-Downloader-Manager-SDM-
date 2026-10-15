import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

export type YtDlpAvailability = {
  path: string
  available: boolean
  version: string | null
  error: 'not-found' | 'not-a-file' | 'version-check-failed' | null
}

const VERSION_CHECK_TIMEOUT_MS = 5_000
const VERSION_OUTPUT_LIMIT_BYTES = 4_096
const VERSION_TEXT_LIMIT = 128

export function getYtDlpPath(): string {
  const binaryDirectory = app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'binaries')
    : join(app.getAppPath(), 'resources', 'binaries')

  return join(binaryDirectory, 'win32-x64', 'yt-dlp.exe')
}

export async function checkYtDlpAvailability(): Promise<YtDlpAvailability> {
  const binaryPath = getYtDlpPath()

  try {
    const fileInfo = await stat(binaryPath)
    if (!fileInfo.isFile()) {
      return {
        path: binaryPath,
        available: false,
        version: null,
        error: 'not-a-file'
      }
    }
  } catch {
    return {
      path: binaryPath,
      available: false,
      version: null,
      error: 'not-found'
    }
  }

  try {
    const version = await readVersion(binaryPath)
    return { path: binaryPath, available: true, version, error: null }
  } catch {
    return {
      path: binaryPath,
      available: false,
      version: null,
      error: 'version-check-failed'
    }
  }
}

function readVersion(binaryPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      binaryPath,
      ['--version'],
      {
        windowsHide: true,
        timeout: VERSION_CHECK_TIMEOUT_MS,
        maxBuffer: VERSION_OUTPUT_LIMIT_BYTES,
        encoding: 'utf8'
      },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const version = stdout.trim()
        if (!version || version.length > VERSION_TEXT_LIMIT) {
          reject(new Error('yt-dlp returned an invalid version string.'))
          return
        }

        resolve(version)
      }
    )
  })
}
