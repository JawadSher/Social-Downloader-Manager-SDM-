import { win32 as path } from 'node:path'
import type { DownloadRequest, MediaFormat } from '../../shared/contracts'
import {
  parseDownloadRequest,
  parseMediaUrl,
  type ValidationResult
} from '../../shared/schemas'

const MAX_REQUEST_ID_LENGTH = 128
const MAX_FILENAME_LENGTH = 255
const ALLOWED_EXTENSIONS = new Set([
  'aac',
  'avi',
  'flac',
  'm4a',
  'mkv',
  'mov',
  'mp3',
  'mp4',
  'ogg',
  'opus',
  'wav',
  'webm'
])
const INVALID_WINDOWS_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/
const RESERVED_WINDOWS_FILENAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

export type InspectionArgs = [requestId: string, url: string]
export type RequestIdArgs = [requestId: string]
export type SaveDialogArgs = [suggestedName: string, extension: string]
export type DownloadStartArgs = [request: DownloadRequest]
export type DownloadIdArgs = [downloadId: string]
export type FilePathArgs = [path: string]

function success<T>(data: T): ValidationResult<T> {
  return { success: true, data }
}

function failure<T = never>(error: string): ValidationResult<T> {
  return { success: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRequestId(value: unknown): ValidationResult<string> {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_REQUEST_ID_LENGTH ||
    !/^[a-zA-Z0-9_-]+$/.test(value)
  ) {
    return failure('Request identifier is invalid.')
  }
  return success(value)
}

function parseSingleStringArg<T extends string>(
  args: unknown[],
  label: string,
  maxLength: number
): ValidationResult<[T]> {
  if (args.length !== 1 || typeof args[0] !== 'string') {
    return failure(`${label} must be provided as text.`)
  }
  const value = args[0].trim()
  if (!value || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    return failure(`${label} is invalid.`)
  }
  return success([value as T])
}

export function parseNoArgs(args: unknown[]): ValidationResult<[]> {
  return args.length === 0 ? success([]) : failure('This request takes no arguments.')
}

export function parseInspectionArgs(args: unknown[]): ValidationResult<InspectionArgs> {
  if (args.length !== 2) return failure('Inspection request is malformed.')

  const requestId = parseRequestId(args[0])
  if (!requestId.success) return requestId

  const url = parseMediaUrl(args[1])
  if (!url.success) return url

  return success([requestId.data, url.data])
}

export function parseRequestIdArgs(args: unknown[]): ValidationResult<RequestIdArgs> {
  if (args.length !== 1) return failure('Cancellation request is malformed.')
  const requestId = parseRequestId(args[0])
  return requestId.success ? success([requestId.data]) : requestId
}

export function parseSaveDialogArgs(args: unknown[]): ValidationResult<SaveDialogArgs> {
  if (args.length !== 2) return failure('Save location request is malformed.')

  const [suggestedName, extension] = args
  if (
    typeof suggestedName !== 'string' ||
    suggestedName.length === 0 ||
    suggestedName.length > MAX_FILENAME_LENGTH ||
    suggestedName !== path.basename(suggestedName) ||
    INVALID_WINDOWS_FILENAME_CHARACTERS.test(suggestedName) ||
    /[. ]$/.test(suggestedName) ||
    RESERVED_WINDOWS_FILENAME.test(suggestedName)
  ) {
    return failure('Suggested filename is invalid.')
  }

  if (typeof extension !== 'string') return failure('File extension is invalid.')
  const normalizedExtension = extension.replace(/^\./, '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(normalizedExtension)) {
    return failure('File extension is not supported.')
  }

  return success([suggestedName, normalizedExtension])
}

function validateOutputPath(value: string): ValidationResult<string> {
  if (!path.isAbsolute(value) || value.length > 32_767) {
    return failure('Choose a valid absolute output path.')
  }

  const filename = path.basename(value)
  if (
    !filename ||
    filename.length > MAX_FILENAME_LENGTH ||
    INVALID_WINDOWS_FILENAME_CHARACTERS.test(filename) ||
    /[. ]$/.test(filename) ||
    RESERVED_WINDOWS_FILENAME.test(filename)
  ) {
    return failure('Output filename is invalid.')
  }

  const extension = path.extname(filename).slice(1).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return failure('Output file extension is not supported.')
  }

  return success(path.normalize(value))
}

export function validateSelectedSavePath(
  value: unknown,
  expectedExtension: string
): ValidationResult<string> {
  if (typeof value !== 'string') return failure('Save dialog did not return a file path.')

  const outputPath = validateOutputPath(value)
  if (!outputPath.success) return outputPath

  const extension = path.extname(outputPath.data).slice(1).toLowerCase()
  if (extension !== expectedExtension) {
    return failure('The selected filename extension does not match the chosen format.')
  }

  return outputPath
}

export function parseDownloadStartArgs(args: unknown[]): ValidationResult<DownloadStartArgs> {
  if (args.length !== 1) return failure('Download request is malformed.')
  if (!isRecord(args[0])) return failure('Download request must be an object.')

  const request = parseDownloadRequest(args[0])
  if (!request.success) return request

  const outputPath = validateOutputPath(request.data.outputPath)
  if (!outputPath.success) return outputPath

  return success([{ ...request.data, outputPath: outputPath.data }])
}

export function validateDownloadRequest(
  value: unknown,
  inspectedUrl: string,
  inspectedFormats: readonly MediaFormat[],
  isAuthorizedOutputPath: (outputPath: string) => boolean
): ValidationResult<DownloadRequest> {
  const parsedRequest = parseDownloadRequest(value)
  if (!parsedRequest.success) return parsedRequest
  const request = parsedRequest.data

  const parsedUrl = parseMediaUrl(request.mediaUrl)
  const parsedInspectedUrl = parseMediaUrl(inspectedUrl)
  if (!parsedUrl.success || !parsedInspectedUrl.success) {
    return failure('Inspect this media URL again before downloading.')
  }
  if (new URL(parsedUrl.data).href !== new URL(parsedInspectedUrl.data).href) {
    return failure('Download URL does not match the inspected media.')
  }

  const selected = validateFormatSelection(
    request.formatId,
    request.outputMode,
    inspectedFormats
  )
  if (!selected.success) return selected

  if (request.outputMode === 'audio-only' && request.audioFormat === null && !selected.data) {
    return failure('Choose an audio format before downloading audio only.')
  }

  const normalizedOutputPath = validateOutputPath(request.outputPath)
  if (!normalizedOutputPath.success) return normalizedOutputPath

  const outputExtension = path.extname(normalizedOutputPath.data).slice(1).toLowerCase()
  if (request.audioFormat && outputExtension !== request.audioFormat) {
    return failure('Output extension must match the selected audio format.')
  }
  if (
    (request.outputMode === 'audio-only' || request.outputMode === 'video-only') &&
    selected.data &&
    request.audioFormat === null &&
    outputExtension !== selected.data.extension.toLowerCase()
  ) {
    return failure('Output extension must match the selected media format.')
  }
  if (!isAuthorizedOutputPath(normalizedOutputPath.data)) {
    return failure('Choose the output path through the save dialog first.')
  }

  return success({ ...request, outputPath: normalizedOutputPath.data })
}

export function parseDownloadIdArgs(args: unknown[]): ValidationResult<DownloadIdArgs> {
  const id = parseSingleStringArg<string>(args, 'Download identifier', MAX_REQUEST_ID_LENGTH)
  if (!id.success) return id
  if (!/^[a-zA-Z0-9_-]+$/.test(id.data[0])) {
    return failure('Download identifier is invalid.')
  }
  return id
}

export function parseFilePathArgs(args: unknown[]): ValidationResult<FilePathArgs> {
  const result = parseSingleStringArg<string>(args, 'File path', 32_767)
  if (!result.success) return result
  if (!path.isAbsolute(result.data[0])) return failure('File path must be absolute.')
  return success([path.normalize(result.data[0])])
}

export function validateFormatSelection(
  formatId: string | null,
  outputMode: DownloadRequest['outputMode'],
  formats: readonly MediaFormat[]
): ValidationResult<MediaFormat | null> {
  if (formatId === null) {
    if (outputMode === 'video-only') {
      return failure('Choose an available video-only format.')
    }
    return success(null)
  }

  const selectedFormat = formats.find((format) => format.formatId === formatId)
  if (!selectedFormat) return failure('Selected format was not returned for this media.')

  if (outputMode === 'video-only' && (!selectedFormat.hasVideo || selectedFormat.hasAudio)) {
    return failure('Selected format is not video-only.')
  }
  if (outputMode === 'audio-only' && (!selectedFormat.hasAudio || selectedFormat.hasVideo)) {
    return failure('Selected format is not audio-only.')
  }
  if (outputMode === 'video-audio' && !selectedFormat.hasVideo) {
    return failure('Selected format does not contain video.')
  }

  return success(selectedFormat)
}
