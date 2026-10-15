import type {
  DetectedPlatform,
  MediaContentType,
  MediaFormat,
  MediaInfo,
  PlaylistEntry,
  PlaylistInfo
} from '../../../shared/contracts'
import { runYtDlp } from './ytdlp-service'

const MAX_PLAYLIST_ENTRIES = 500
const MAX_FORMATS = 1_000
const MAX_TITLE_LENGTH = 2_000
const MAX_DESCRIPTION_LENGTH = 20_000
const MAX_TEXT_LENGTH = 512

const INSPECTION_ARGS = [
  '--ignore-config',
  '--no-warnings',
  '--skip-download',
  '--dump-single-json',
  '--flat-playlist',
  '--playlist-end',
  String(MAX_PLAYLIST_ENTRIES)
] as const

export class MediaInspectionError extends Error {
  constructor(
    readonly code: 'invalid-output',
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'MediaInspectionError'
  }
}

export async function inspectMedia(requestId: string, url: string): Promise<MediaInfo> {
  const { stdout } = await runYtDlp([...INSPECTION_ARGS, url], { requestId })
  let data: unknown

  try {
    data = JSON.parse(stdout)
  } catch (error) {
    throw new MediaInspectionError(
      'invalid-output',
      'yt-dlp returned invalid media information.',
      { cause: error }
    )
  }

  if (!isRecord(data)) {
    throw new MediaInspectionError('invalid-output', 'yt-dlp returned an unexpected response.')
  }

  return normalizeMediaInfo(data, url)
}

export function normalizeMediaInfo(data: Record<string, unknown>, inputUrl: string): MediaInfo {
  const formats = Array.isArray(data.formats) ? data.formats : []
  const normalizedFormats = formats
    .slice(0, MAX_FORMATS)
    .map(normalizeFormat)
    .filter((format): format is MediaFormat => format !== null)

  const rawEntries = Array.isArray(data.entries) ? data.entries : null
  const contentType = getContentType(data, rawEntries, formats)
  const playlist = contentType === 'playlist'
    ? normalizePlaylist(data, rawEntries ?? [])
    : null

  return {
    id: getString(data.id, MAX_TEXT_LENGTH),
    webpageUrl: getHttpUrl(data.webpage_url) ?? inputUrl,
    contentType,
    platform: normalizePlatform(data),
    title:
      getString(data.title, MAX_TITLE_LENGTH) ??
      getString(data.fulltitle, MAX_TITLE_LENGTH) ??
      'Untitled media',
    description: getString(data.description, MAX_DESCRIPTION_LENGTH),
    thumbnailUrl: getHttpUrl(data.thumbnail),
    uploader:
      getString(data.uploader, MAX_TITLE_LENGTH) ??
      getString(data.channel, MAX_TITLE_LENGTH) ??
      getString(data.creator, MAX_TITLE_LENGTH),
    durationSeconds: getFiniteNumber(data.duration),
    playlist,
    formats: normalizedFormats,
    formatsTruncated: formats.length > MAX_FORMATS
  }
}

function normalizePlatform(data: Record<string, unknown>): DetectedPlatform | null {
  const extractorKey =
    getString(data.extractor_key, MAX_TEXT_LENGTH) ??
    getString(data.extractor, MAX_TEXT_LENGTH)
  const name =
    getString(data.extractor, MAX_TEXT_LENGTH) ??
    getString(data.extractor_key, MAX_TEXT_LENGTH)

  return extractorKey && name ? { extractorKey, name } : null
}

function getContentType(
  data: Record<string, unknown>,
  entries: unknown[] | null,
  formats: unknown[]
): MediaContentType {
  const isPlaylist =
    entries !== null ||
    data._type === 'playlist' ||
    data._type === 'multi_video' ||
    getNonNegativeInteger(data.playlist_count) !== null ||
    getString(data.playlist_title, MAX_TITLE_LENGTH) !== null
  if (isPlaylist) return 'playlist'

  if (data._type === 'video' || formats.length > 0) return 'single'
  return 'unknown'
}

function normalizePlaylist(data: Record<string, unknown>, rawEntries: unknown[]): PlaylistInfo {
  const entries = rawEntries.slice(0, MAX_PLAYLIST_ENTRIES).map(normalizePlaylistEntry)
  const reportedCount = getNonNegativeInteger(data.playlist_count)
  const truncated =
    rawEntries.length > MAX_PLAYLIST_ENTRIES ||
    (reportedCount !== null && reportedCount > entries.length) ||
    (reportedCount === null && rawEntries.length >= MAX_PLAYLIST_ENTRIES)

  return {
    title: getString(data.playlist_title, MAX_TITLE_LENGTH) ?? getString(data.title, MAX_TITLE_LENGTH),
    entryCount: reportedCount ?? (truncated ? null : rawEntries.length),
    entries,
    entriesTruncated: truncated
  }
}

function normalizePlaylistEntry(value: unknown): PlaylistEntry {
  const entry = isRecord(value) ? value : {}
  const id = getString(entry.id, MAX_TEXT_LENGTH)
  const title = getString(entry.title, MAX_TITLE_LENGTH) ?? id ?? 'Untitled item'

  return {
    id,
    title,
    webpageUrl: getHttpUrl(entry.webpage_url) ?? getHttpUrl(entry.url),
    durationSeconds: getFiniteNumber(entry.duration),
    thumbnailUrl: getHttpUrl(entry.thumbnail)
  }
}

function normalizeFormat(value: unknown): MediaFormat | null {
  if (!isRecord(value)) return null

  const formatId = getString(value.format_id, MAX_TEXT_LENGTH)
  if (!formatId) return null

  const width = getPositiveInteger(value.width)
  const height = getPositiveInteger(value.height)
  const videoCodec = normalizeCodec(value.vcodec)
  const audioCodec = normalizeCodec(value.acodec)
  const videoExtension = normalizeCodec(value.video_ext)
  const audioExtension = normalizeCodec(value.audio_ext)
  const hasVideo =
    (videoCodec !== null && videoCodec !== 'none') ||
    width !== null ||
    height !== null ||
    (videoExtension !== null && videoExtension !== 'none')
  const hasAudio =
    (audioCodec !== null && audioCodec !== 'none') ||
    (audioExtension !== null && audioExtension !== 'none')

  if (!hasVideo && !hasAudio) return null

  const rawResolution = getString(value.resolution, MAX_TEXT_LENGTH)
  const resolution =
    rawResolution ?? (height !== null ? `${height}p` : width !== null ? `${width}px` : null)
  const extension =
    getString(value.ext, MAX_TEXT_LENGTH) ??
    (hasVideo ? videoExtension : null) ??
    (hasAudio ? audioExtension : null) ??
    'unknown'

  return {
    formatId,
    extension,
    resolution,
    width,
    height,
    framesPerSecond: getPositiveNumber(value.fps),
    videoCodec,
    audioCodec,
    hasVideo,
    hasAudio,
    fileSizeBytes: getNonNegativeNumber(value.filesize),
    approximateFileSizeBytes: getNonNegativeNumber(value.filesize_approx),
    note:
      getString(value.format_note, MAX_TEXT_LENGTH) ??
      getString(value.format, MAX_TEXT_LENGTH)
  }
}

function normalizeCodec(value: unknown): string | null {
  const codec = getString(value, MAX_TEXT_LENGTH)
  return codec?.toLowerCase() === 'unknown' ? null : codec
}

function getString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function getHttpUrl(value: unknown): string | null {
  const candidate = getString(value, 8_192)
  if (!candidate) return null

  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

function getFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return value
}

function getNonNegativeNumber(value: unknown): number | null {
  return getFiniteNumber(value)
}

function getNonNegativeInteger(value: unknown): number | null {
  const number = getFiniteNumber(value)
  return number !== null && Number.isSafeInteger(number) ? number : null
}

function getPositiveNumber(value: unknown): number | null {
  const number = getFiniteNumber(value)
  return number !== null && number > 0 ? number : null
}

function getPositiveInteger(value: unknown): number | null {
  const number = getPositiveNumber(value)
  return number !== null && Number.isSafeInteger(number) ? number : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
