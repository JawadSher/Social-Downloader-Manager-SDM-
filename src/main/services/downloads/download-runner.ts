import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { DownloadRequest, MediaFormat } from '../../../shared/contracts'
import { getFfprobePath, getFfmpegDirectory } from '../media/binary-availability'
import { runYtDlp, YtDlpProcessError } from '../media/ytdlp-service'

const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000
const MERGEABLE_CONTAINERS = new Set(['avi', 'flv', 'mkv', 'mov', 'mp4', 'webm'])

export type VideoAudioDownloadResult = {
  outputPath: string
  fileSizeBytes: number
}

export class DownloadRunnerError extends Error {
  constructor(
    readonly code:
      | 'ffmpeg-missing'
      | 'format-unavailable'
      | 'processing-failed'
      | 'conversion-failed'
      | 'download-failed',
    message: string
  ) {
    super(message)
    this.name = 'DownloadRunnerError'
  }
}

export async function runVideoAudioDownload(
  downloadId: string,
  request: DownloadRequest,
  format: MediaFormat
): Promise<VideoAudioDownloadResult> {
  const needsMerge = !format.hasAudio
  const ffmpegDirectory = getFfmpegDirectory()

  if (needsMerge) {
    try {
      const ffmpegInfo = await stat(resolve(ffmpegDirectory, 'ffmpeg.exe'))
      if (!ffmpegInfo.isFile()) throw new Error('FFmpeg is not a file.')
    } catch {
      throw new DownloadRunnerError(
        'ffmpeg-missing',
        'FFmpeg is required to combine this video with its separate audio stream.'
      )
    }

    if (!MERGEABLE_CONTAINERS.has(format.extension.toLowerCase())) {
      throw new DownloadRunnerError(
        'format-unavailable',
        'The selected video format cannot be merged into its reported container.'
      )
    }
  }

  const formatSelector = needsMerge
    ? format.formatId + '+bestaudio'
    : format.formatId
  const args = [
    '--ignore-config',
    '--no-warnings',
    '--no-progress',
    '--force-overwrites',
    '--format',
    formatSelector,
    '--output',
    request.outputPath,
    '--print',
    'after_move:filepath'
  ]

  if (needsMerge) {
    args.push('--ffmpeg-location', ffmpegDirectory, '--merge-output-format', format.extension)
  }
  args.push(request.mediaUrl)

  try {
    const { stdout } = await runYtDlp(args, {
      requestId: downloadId,
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 1024 * 1024
    })
    const reportedPath = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1)

    if (!reportedPath || resolve(reportedPath).toLowerCase() !== resolve(request.outputPath).toLowerCase()) {
      throw new DownloadRunnerError(
        'download-failed',
        'yt-dlp completed without confirming the selected output path.'
      )
    }

    const outputInfo = await stat(request.outputPath)
    if (!outputInfo.isFile() || outputInfo.size <= 0) {
      throw new DownloadRunnerError(
        'download-failed',
        'The completed output file could not be verified.'
      )
    }

    return { outputPath: request.outputPath, fileSizeBytes: outputInfo.size }
  } catch (error) {
    if (error instanceof DownloadRunnerError) throw error
    if (error instanceof YtDlpProcessError) {
      const diagnostic = error.diagnostic?.toLowerCase() ?? ''
      if (/ffmpeg|merger|post.?process/.test(diagnostic)) {
        throw new DownloadRunnerError(
          'processing-failed',
          'Media processing failed. Check that FFmpeg is installed and try again.'
        )
      }
      if (/unable to download|timed? out|connection|temporary failure|network|http error/.test(diagnostic)) {
        throw new DownloadRunnerError(
          'download-failed',
          'A network or source error interrupted the download.'
        )
      }
      throw new DownloadRunnerError('download-failed', 'The media download failed. Try again.')
    }
    throw new DownloadRunnerError('download-failed', 'The media download could not be completed.')
  }
}

export async function runAudioOnlyDownload(
  downloadId: string,
  request: DownloadRequest,
  format: MediaFormat
): Promise<VideoAudioDownloadResult> {
  const conversionFormat = request.audioFormat
  const ffmpegDirectory = getFfmpegDirectory()

  if (conversionFormat) {
    try {
      const ffmpegInfo = await stat(resolve(ffmpegDirectory, 'ffmpeg.exe'))
      if (!ffmpegInfo.isFile()) throw new Error('FFmpeg is not a file.')
    } catch {
      throw new DownloadRunnerError(
        'ffmpeg-missing',
        'FFmpeg is required to convert this audio format.'
      )
    }
  }

  const args = [
    '--ignore-config',
    '--no-warnings',
    '--no-progress',
    '--force-overwrites',
    '--format',
    format.formatId,
    '--output',
    request.outputPath
  ]
  if (conversionFormat) {
    args.push(
      '--extract-audio',
      '--audio-format',
      conversionFormat,
      '--ffmpeg-location',
      ffmpegDirectory
    )
  }
  args.push('--print', 'after_move:filepath', request.mediaUrl)

  try {
    const { stdout } = await runYtDlp(args, {
      requestId: downloadId,
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 1024 * 1024
    })
    const reportedPath = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1)

    if (!reportedPath || resolve(reportedPath).toLowerCase() !== resolve(request.outputPath).toLowerCase()) {
      throw new DownloadRunnerError(
        conversionFormat ? 'conversion-failed' : 'download-failed',
        'The completed output did not match the selected save path.'
      )
    }

    const outputInfo = await stat(request.outputPath)
    if (!outputInfo.isFile() || outputInfo.size <= 0) {
      throw new DownloadRunnerError(
        conversionFormat ? 'conversion-failed' : 'download-failed',
        'The completed audio file could not be verified.'
      )
    }

    return { outputPath: request.outputPath, fileSizeBytes: outputInfo.size }
  } catch (error) {
    if (error instanceof DownloadRunnerError) throw error
    if (error instanceof YtDlpProcessError) {
      const diagnostic = error.diagnostic?.toLowerCase() ?? ''
      if (/unable to download|timed? out|connection|temporary failure|network|http error/.test(diagnostic)) {
        throw new DownloadRunnerError(
          'download-failed',
          'A network or source error interrupted the audio download.'
        )
      }
      if (conversionFormat) {
        throw new DownloadRunnerError(
          'conversion-failed',
          'Audio conversion failed. Choose another format or keep the source format.'
        )
      }
      throw new DownloadRunnerError('download-failed', 'The audio download failed. Try again.')
    }
    throw new DownloadRunnerError(
      conversionFormat ? 'conversion-failed' : 'download-failed',
      conversionFormat
        ? 'Audio conversion could not be completed.'
        : 'The audio download could not be completed.'
    )
  }
}

export async function runVideoOnlyDownload(
  downloadId: string,
  request: DownloadRequest,
  format: MediaFormat
): Promise<VideoAudioDownloadResult> {
  if (!format.hasVideo || format.hasAudio) {
    throw new DownloadRunnerError(
      'format-unavailable',
      'Select a video-only format returned for this media.'
    )
  }

  const args = [
    '--ignore-config',
    '--no-warnings',
    '--no-progress',
    '--force-overwrites',
    '--format',
    format.formatId,
    '--output',
    request.outputPath,
    '--print',
    'after_move:filepath',
    request.mediaUrl
  ]

  try {
    const { stdout } = await runYtDlp(args, {
      requestId: downloadId,
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 1024 * 1024
    })
    const reportedPath = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1)
    if (!reportedPath || resolve(reportedPath).toLowerCase() !== resolve(request.outputPath).toLowerCase()) {
      throw new DownloadRunnerError('download-failed', 'The completed output did not match the selected save path.')
    }

    const outputInfo = await stat(request.outputPath)
    if (!outputInfo.isFile() || outputInfo.size <= 0) {
      throw new DownloadRunnerError('download-failed', 'The completed video file could not be verified.')
    }

    try {
      const probeInfo = await stat(getFfprobePath())
      if (!probeInfo.isFile()) {
        throw new DownloadRunnerError('processing-failed', 'The configured ffprobe path is not a file.')
      }
      {
        const probeResult = await probeVideoOnlyOutput(getFfprobePath(), request.outputPath)
        if (!probeResult.hasVideo || probeResult.hasAudio) {
          throw new DownloadRunnerError(
            'processing-failed',
            'The downloaded file did not contain video-only streams as requested.'
          )
        }
      }
    } catch (error) {
      if (error instanceof DownloadRunnerError) throw error
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new DownloadRunnerError('processing-failed', 'The downloaded video streams could not be verified.')
      }
    }

    return { outputPath: request.outputPath, fileSizeBytes: outputInfo.size }
  } catch (error) {
    if (error instanceof DownloadRunnerError) throw error
    if (error instanceof YtDlpProcessError) {
      const diagnostic = error.diagnostic?.toLowerCase() ?? ''
      if (/unable to download|timed? out|connection|temporary failure|network|http error/.test(diagnostic)) {
        throw new DownloadRunnerError('download-failed', 'A network or source error interrupted the video download.')
      }
      throw new DownloadRunnerError('download-failed', 'The video-only download failed. Try again.')
    }
    throw new DownloadRunnerError('download-failed', 'The video-only download could not be completed.')
  }
}

function probeVideoOnlyOutput(ffprobePath: string, outputPath: string): Promise<{ hasVideo: boolean; hasAudio: boolean }> {
  return new Promise((resolveProbe, rejectProbe) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', outputPath],
      { windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024, encoding: 'utf8' },
      (error, stdout) => {
        if (error) {
          rejectProbe(error)
          return
        }
        try {
          const parsed: unknown = JSON.parse(stdout)
          if (!parsed || typeof parsed !== 'object' || !('streams' in parsed) || !Array.isArray(parsed.streams)) {
            throw new Error('ffprobe returned malformed stream data.')
          }
          const streamTypes = parsed.streams.flatMap((stream) =>
            stream && typeof stream === 'object' && 'codec_type' in stream && typeof stream.codec_type === 'string'
              ? [stream.codec_type]
              : []
          )
          resolveProbe({ hasVideo: streamTypes.includes('video'), hasAudio: streamTypes.includes('audio') })
        } catch (parseError) {
          rejectProbe(parseError)
        }
      }
    )
  })
}

