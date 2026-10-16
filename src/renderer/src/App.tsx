import { useEffect, useRef, useState, type JSX } from 'react'
import type { MediaFormat, MediaInfo } from '../../shared/contracts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Link2,
  ClipboardPaste,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Download,
  Search,
  LoaderCircle,
  X,
} from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null
  const wholeSeconds = Math.floor(seconds)
  const hours = Math.floor(wholeSeconds / 3_600)
  const minutes = Math.floor((wholeSeconds % 3_600) / 60)
  const remainder = wholeSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return null
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(0)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function getMaximumVideoResolution(formats: MediaFormat[]): string | null {
  const heights = formats
    .filter((format) => format.hasVideo)
    .map((format) => {
      if (format.height !== null) return format.height
      const resolution = format.resolution
      const match = resolution?.match(/(?:^|\s)(\d{3,5})p\b/i) ?? resolution?.match(/\d{2,5}x(\d{2,5})/i)
      return match ? Number(match[1]) : null
    })
    .filter((height): height is number => height !== null && Number.isFinite(height) && height > 0)

  return heights.length > 0 ? `${Math.max(...heights)}p` : null
}

function getFormatSizeSummary(formats: MediaFormat[]): string | null {
  const sizedFormats = formats
    .map((format) => ({
      size: format.fileSizeBytes ?? format.approximateFileSizeBytes,
      estimated: format.fileSizeBytes === null && format.approximateFileSizeBytes !== null
    }))
    .filter((format): format is { size: number; estimated: boolean } => format.size !== null)

  if (sizedFormats.length === 0) return null

  const sizes = sizedFormats.map((format) => format.size)
  const minimum = Math.min(...sizes)
  const maximum = Math.max(...sizes)
  const range =
    minimum === maximum
      ? formatFileSize(minimum)
      : `${formatFileSize(minimum)}–${formatFileSize(maximum)}`

  return `${sizedFormats.some((format) => format.estimated) ? 'Approx. ' : ''}${range}`
}

function getFormatLabel(format: MediaFormat): string {
  const parts = [format.resolution, format.extension.toUpperCase()]
  if (format.framesPerSecond) parts.push(`${format.framesPerSecond} FPS`)
  if (format.hasVideo && format.hasAudio) parts.push('Video + audio')
  else if (format.hasVideo) parts.push('Video only')
  else if (format.hasAudio) parts.push('Audio only')
  const size = formatFileSize(format.fileSizeBytes ?? format.approximateFileSizeBytes)
  if (size) {
    const isEstimate = format.fileSizeBytes === null && format.approximateFileSizeBytes !== null
    parts.push(`${isEstimate ? '~' : ''}${size}`)
  }
  return parts.filter(Boolean).join(' · ')
}

export default function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>('system')
  const [url, setUrl] = useState('')
  const [clipboardMessage, setClipboardMessage] = useState('')
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null)
  const [inspectionError, setInspectionError] = useState<string | null>(null)
  const [inspectionMessage, setInspectionMessage] = useState('')
  const [isInspecting, setIsInspecting] = useState(false)
  const activeRequestId = useRef<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    return () => {
      const requestId = activeRequestId.current
      activeRequestId.current = null
      if (requestId) {
        void window.sdm.media.cancelInspection(requestId).catch(() => undefined)
      }
    }
  }, [])

  const invalidateInspection = (): void => {
    const requestId = activeRequestId.current
    activeRequestId.current = null
    if (requestId) {
      void window.sdm.media.cancelInspection(requestId).catch(() => undefined)
    }
    setIsInspecting(false)
    setMediaInfo(null)
    setInspectionError(null)
    setInspectionMessage('')
  }

  const handleInspect = async (): Promise<void> => {
    const candidate = url.trim()
    if (!candidate) {
      setInspectionError('Enter a URL to inspect.')
      setInspectionMessage('')
      return
    }

    const previousRequestId = activeRequestId.current
    if (previousRequestId) {
      void window.sdm.media.cancelInspection(previousRequestId).catch(() => undefined)
    }

    const requestId = `inspect-${crypto.randomUUID()}`
    activeRequestId.current = requestId
    setIsInspecting(true)
    setMediaInfo(null)
    setInspectionError(null)
    setInspectionMessage('')

    try {
      const result = await window.sdm.media.inspectUrl(requestId, candidate)
      if (activeRequestId.current !== requestId) return

      if (!result.success) {
        if (result.error.code === 'cancelled') {
          setInspectionMessage('Inspection cancelled.')
        } else {
          setInspectionError(result.error.message)
        }
        return
      }

      setMediaInfo(result.data)
      setInspectionMessage('Media information retrieved. No media was downloaded.')
    } catch {
      if (activeRequestId.current === requestId) {
        setInspectionError('Inspection could not be completed. Try again.')
      }
    } finally {
      if (activeRequestId.current === requestId) {
        activeRequestId.current = null
        setIsInspecting(false)
      }
    }
  }

  const handleCancelInspection = (): void => {
    const requestId = activeRequestId.current
    if (!requestId) return

    activeRequestId.current = null
    setIsInspecting(false)
    setMediaInfo(null)
    setInspectionError(null)
    setInspectionMessage('Inspection cancelled.')
    void window.sdm.media.cancelInspection(requestId).catch(() => undefined)
  }

  const handleUrlChange = (value: string): void => {
    setUrl(value)
    setClipboardMessage('')
    invalidateInspection()
  }

  const handlePaste = async (): Promise<void> => {
    setClipboardMessage('')
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        setClipboardMessage('Clipboard is empty.')
        return
      }
      handleUrlChange(text.trim())
      setClipboardMessage('Pasted from clipboard.')
    } catch {
      setClipboardMessage(
        'Clipboard access was blocked by the browser. Press Ctrl + V to paste manually.'
      )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text)] antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-surface-raised)] focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-[var(--color-focus)]"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-background-soft)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-semibold tracking-wide"
            >
              SDM
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">
                Social Downloader Manager
              </p>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">
                Windows desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[var(--color-text-subtle)] sm:inline">
              Theme
            </span>
            <div
              role="group"
              aria-label="Theme selector"
              className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
            >
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isActive = theme === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    aria-pressed={isActive}
                    aria-label={`Switch to ${opt.label} theme`}
                    onClick={() => setTheme(opt.value)}
                    className={
                      isActive
                        ? 'h-7 rounded-full bg-[var(--color-accent)] px-3 text-xs font-medium text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)]'
                        : 'h-7 rounded-full px-3 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                    }
                  >
                    <Icon className="mr-1 size-3.5" />
                    {opt.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8"
      >
        {/* URL Card */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="size-4 text-[var(--color-text-muted)]" />
                  Source URL
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                  Inspect a link to see the media details and available formats.
                </CardDescription>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border-subtle)] sm:inline-flex">
                <span
                  className={`size-1.5 rounded-full ${isInspecting ? 'animate-pulse bg-[var(--color-accent)]' : 'bg-[var(--color-success)]'}`}
                />
                {isInspecting ? 'Inspecting' : 'Inspection ready'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="source-url"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]"
              >
                URL
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Input
                    id="source-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !isInspecting) void handleInspect()
                    }}
                    placeholder="https://..."
                    className="h-11 border-[var(--color-border)] bg-[var(--color-background)] pl-3 pr-3 text-sm placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-focus)] focus-visible:ring-[var(--color-focus)]/30"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePaste}
                    className="h-11 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-sm hover:bg-[var(--color-surface-hover)]"
                  >
                    <ClipboardPaste className="size-4" />
                    Paste
                  </Button>
                  <Button
                    type="button"
                    disabled={!url.trim() || isInspecting}
                    onClick={() => void handleInspect()}
                    className="h-11 shrink-0 bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isInspecting ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Inspect
                  </Button>
                  {isInspecting && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelInspection}
                      className="h-11 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-sm hover:bg-[var(--color-surface-hover)]"
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <p
                role="status"
                aria-live="polite"
                className="min-h-5 text-xs leading-relaxed text-[var(--color-text-muted)]"
              >
                {isInspecting ? (
                  'Fetching media information…'
                ) : inspectionMessage ? (
                  inspectionMessage
                ) : clipboardMessage ? (
                  clipboardMessage
                ) : (
                  <span className="text-[var(--color-text-subtle)]">
                    Paste uses{' '}
                    <code className="rounded bg-[var(--color-background-soft)] px-1 py-0.5 font-mono text-xs ring-1 ring-inset ring-[var(--color-border-subtle)]">
                      navigator.clipboard.readText()
                    </code>{' '}
                    only when you click Paste.
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {inspectionError ? (
                <p role="alert" className="font-medium text-[var(--color-danger)]">
                  {inspectionError}
                </p>
              ) : isInspecting ? (
                <p>Fetching metadata and formats. The media itself is not downloaded.</p>
              ) : mediaInfo ? (
                <div className="space-y-1">
                  <p>
                    {mediaInfo.platform
                      ? `Platform detected: ${mediaInfo.platform.name}.`
                      : 'Media information was retrieved, but the platform could not be identified.'}
                  </p>
                  <p>
                    {mediaInfo.contentType === 'single'
                      ? 'Content type: single item.'
                      : mediaInfo.contentType === 'playlist'
                        ? 'Content type: playlist or multi-item media.'
                        : 'The extractor did not provide enough information to determine whether this is a single item or a playlist.'}
                  </p>
                </div>
              ) : (
                <p>Paste a URL and select Inspect to retrieve its real media details.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Preview */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">
                Media Preview
              </CardTitle>
              <span className="text-xs text-[var(--color-text-subtle)]">
                {isInspecting ? 'Inspecting' : mediaInfo ? 'Inspection complete' : 'Preview'}
              </span>
            </CardHeader>
            <Separator className="bg-[var(--color-border-subtle)]" />
            <CardContent className="p-5">
              {isInspecting ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-10 text-center">
                  <LoaderCircle className="mb-3 size-6 animate-spin text-[var(--color-accent)]" />
                  <p className="text-sm font-medium">Fetching media information…</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">
                    This may take a moment. No media is downloaded during inspection.
                  </p>
                </div>
              ) : mediaInfo ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {mediaInfo.thumbnailUrl ? (
                      <img
                        src={mediaInfo.thumbnailUrl}
                        alt={`Thumbnail for ${mediaInfo.title}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="aspect-video w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] object-cover sm:w-52"
                      />
                    ) : (
                      <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] text-[var(--color-text-subtle)] sm:w-52">
                        <ImageIcon className="size-7" aria-hidden="true" />
                        <span className="sr-only">No thumbnail available</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="break-words text-base font-semibold leading-snug">
                        {mediaInfo.title}
                      </h3>
                      <dl className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
                        {mediaInfo.platform && (
                          <div className="flex gap-2">
                            <dt className="font-medium text-[var(--color-text-subtle)]">
                              Platform
                            </dt>
                            <dd>{mediaInfo.platform.name}</dd>
                          </div>
                        )}
                        {mediaInfo.uploader && (
                          <div className="flex gap-2">
                            <dt className="font-medium text-[var(--color-text-subtle)]">
                              Creator
                            </dt>
                            <dd className="break-words">{mediaInfo.uploader}</dd>
                          </div>
                        )}
                        {formatDuration(mediaInfo.durationSeconds) && (
                          <div className="flex gap-2">
                            <dt className="font-medium text-[var(--color-text-subtle)]">
                              Duration
                            </dt>
                            <dd>{formatDuration(mediaInfo.durationSeconds)}</dd>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <dt className="font-medium text-[var(--color-text-subtle)]">
                            Max video resolution
                          </dt>
                          <dd>{getMaximumVideoResolution(mediaInfo.formats) ?? 'Not reported'}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-medium text-[var(--color-text-subtle)]">
                            Audio
                          </dt>
                          <dd>
                            {mediaInfo.formats.some((format) => format.hasAudio)
                              ? 'Available in returned formats'
                              : 'Not reported by extractor'}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-medium text-[var(--color-text-subtle)]">
                            Format size range
                          </dt>
                          <dd>{getFormatSizeSummary(mediaInfo.formats) ?? 'Not reported'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {mediaInfo.description && (
                    <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {mediaInfo.description}
                    </p>
                  )}

                  {mediaInfo.playlist && (
                    <section className="space-y-2" aria-label="Playlist information">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                          {mediaInfo.playlist.title ?? 'Playlist'}
                        </h4>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {mediaInfo.playlist.entryCount === null
                            ? `${mediaInfo.playlist.entries.length} listed`
                            : `${mediaInfo.playlist.entryCount} items`}
                        </span>
                      </div>
                      {mediaInfo.playlist.entries.length > 0 && (
                        <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] p-2">
                          {mediaInfo.playlist.entries.slice(0, 8).map((entry, index) => (
                            <li
                              key={`${entry.id ?? entry.title}-${index}`}
                              className="truncate text-xs text-[var(--color-text-muted)]"
                              title={entry.title}
                            >
                              {index + 1}. {entry.title}
                            </li>
                          ))}
                        </ul>
                      )}
                      {mediaInfo.playlist.entries.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Playlist details were detected, but no entries were returned by the extractor.
                        </p>
                      )}
                      {mediaInfo.playlist.entries.length > 8 && (
                        <p className="text-xs text-[var(--color-text-subtle)]">
                          Showing the first 8 of {mediaInfo.playlist.entries.length} returned entries.
                        </p>
                      )}
                      {mediaInfo.playlist.entriesTruncated && (
                        <p className="text-xs text-[var(--color-text-subtle)]">
                          The extractor response was limited to the first 500 playlist entries; the full playlist count may be larger.
                        </p>
                      )}
                    </section>
                  )}

                  {mediaInfo.contentType === 'playlist' && !mediaInfo.playlist && (
                    <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-text-muted)]">
                      Playlist information was indicated, but its title and entries were not available.
                    </p>
                  )}
                  {mediaInfo.contentType === 'unknown' && !mediaInfo.playlist && (
                    <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-text-muted)]">
                      Playlist information was not supplied, so this result cannot be confirmed as a single item or a playlist.
                    </p>
                  )}

                  <section className="space-y-2" aria-label="Available formats">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                        Available formats
                      </h4>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {mediaInfo.formats.length} found
                      </span>
                    </div>
                    {mediaInfo.formats.length > 0 ? (
                      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] p-2">
                        {mediaInfo.formats.slice(0, 20).map((format) => (
                          <li
                            key={format.formatId}
                            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded px-2 py-1.5 text-xs hover:bg-[var(--color-surface-hover)]"
                          >
                            <span className="font-medium text-[var(--color-text)]">
                              {getFormatLabel(format)}
                            </span>
                            <span className="font-mono text-[var(--color-text-subtle)]">
                              ID {format.formatId}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
                        No downloadable formats were reported for this media.
                      </p>
                    )}
                    {mediaInfo.formats.length > 20 && (
                      <p className="text-xs text-[var(--color-text-subtle)]">
                        Showing the first 20 of {mediaInfo.formats.length} reported formats.
                      </p>
                    )}
                    {mediaInfo.formatsTruncated && (
                      <p className="text-xs text-[var(--color-text-subtle)]">
                        The format list is capped at 1,000 items.
                      </p>
                    )}
                  </section>
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-10 text-center">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border-subtle)]">
                    <ImageIcon className="size-5" />
                  </div>
                  <p className="text-sm font-medium">
                    {inspectionError ? 'No media preview available' : 'No media inspected yet'}
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {inspectionError
                      ? 'Correct the URL or try again when the media is accessible.'
                      : 'Title, thumbnail, and available formats will appear here after inspection.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            {/* Output Settings */}
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Output Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Mode and quality selection will be enabled in a later step.
                </CardDescription>
              </CardHeader>
              <Separator className="bg-[var(--color-border-subtle)]" />
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    Output mode
                  </label>
                  <Select disabled>
                    <SelectTrigger className="h-11 border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] text-[var(--color-text-subtle)]">
                      <SelectValue placeholder="Available after inspection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">
                        Available after inspection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    Format & quality
                  </label>
                  <Select disabled>
                    <SelectTrigger className="h-11 border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] text-[var(--color-text-subtle)]">
                      <SelectValue placeholder="Available after inspection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">
                        Available after inspection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
                    Format options will be populated from the inspected media.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Download Status */}
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Download className="size-4 text-[var(--color-text-muted)]" />
                  Download Status
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[var(--color-border-subtle)]" />
              <CardContent className="p-5">
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] p-4">
                  <p className="text-sm font-medium text-[var(--color-text-muted)]">
                    No active download
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-subtle)]">
                    Queue, destination folder, and controls will appear here
                    once downloading is implemented. Progress will only be shown
                    during a real download.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-[var(--color-border-subtle)] px-4 py-5 text-xs text-[var(--color-text-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Media inspection is available. Downloading is coming next.</p>
      </footer>
    </div>
  )
}
