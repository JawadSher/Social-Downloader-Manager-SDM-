import type { AudioFormat, DownloadRequest, OutputMode } from './contracts'

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const MAX_URL_LENGTH = 8_192
const MAX_PATH_LENGTH = 32_767
const MAX_FORMAT_ID_LENGTH = 256

const OUTPUT_MODES = new Set<OutputMode>([
  'video-audio',
  'audio-only',
  'video-only',
  'best-available'
])

const AUDIO_FORMATS = new Set<AudioFormat>(['mp3', 'm4a', 'opus', 'wav'])

function success<T>(data: T): ValidationResult<T> {
  return { success: true, data }
}

function failure<T = never>(error: string): ValidationResult<T> {
  return { success: false, error }
}

export function parseMediaUrl(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') return failure('URL must be text.')

  const candidate = value.trim()
  if (!candidate) return failure('Enter a URL.')
  if (candidate.length > MAX_URL_LENGTH) return failure('URL is too long.')
  if (/[\u0000-\u001f\u007f]/.test(candidate)) {
    return failure('URL contains invalid characters.')
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return failure('URL must use HTTP or HTTPS.')
    }
    if (!parsed.hostname) return failure('URL must include a host name.')
  } catch {
    return failure('Enter a valid URL.')
  }

  return success(candidate)
}

export function parseOutputMode(value: unknown): ValidationResult<OutputMode> {
  if (typeof value !== 'string' || !OUTPUT_MODES.has(value as OutputMode)) {
    return failure('Select a supported output mode.')
  }
  return success(value as OutputMode)
}

export function parseDownloadRequest(value: unknown): ValidationResult<DownloadRequest> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Download request must be an object.')
  }

  const request = value as Record<string, unknown>
  const mediaUrl = parseMediaUrl(request.mediaUrl)
  if (!mediaUrl.success) return mediaUrl

  const outputMode = parseOutputMode(request.outputMode)
  if (!outputMode.success) return outputMode

  if (
    typeof request.outputPath !== 'string' ||
    request.outputPath.trim().length === 0 ||
    request.outputPath.length > MAX_PATH_LENGTH
  ) {
    return failure('Choose a valid output path.')
  }

  const formatId = request.formatId
  if (
    formatId !== null &&
    (typeof formatId !== 'string' ||
      formatId.length === 0 ||
      formatId.length > MAX_FORMAT_ID_LENGTH)
  ) {
    return failure('Selected format is invalid.')
  }

  const audioFormat = request.audioFormat
  if (
    audioFormat !== null &&
    (typeof audioFormat !== 'string' || !AUDIO_FORMATS.has(audioFormat as AudioFormat))
  ) {
    return failure('Selected audio format is invalid.')
  }
  if (audioFormat !== null && outputMode.data !== 'audio-only') {
    return failure('Audio conversion is available only in audio-only mode.')
  }

  return success({
    mediaUrl: mediaUrl.data,
    outputMode: outputMode.data,
    formatId: formatId as string | null,
    outputPath: request.outputPath,
    audioFormat: audioFormat as AudioFormat | null
  })
}
