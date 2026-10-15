export type DetectedPlatform = {
  extractorKey: string
  name: string
}

export type MediaFormat = {
  formatId: string
  extension: string
  resolution: string | null
  width: number | null
  height: number | null
  framesPerSecond: number | null
  videoCodec: string | null
  audioCodec: string | null
  hasVideo: boolean
  hasAudio: boolean
  fileSizeBytes: number | null
  approximateFileSizeBytes: number | null
  note: string | null
}

export type PlaylistEntry = {
  id: string | null
  title: string
  webpageUrl: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
}

export type PlaylistInfo = {
  title: string | null
  entryCount: number | null
  entries: PlaylistEntry[]
}

export type MediaInfo = {
  id: string | null
  webpageUrl: string
  platform: DetectedPlatform | null
  title: string
  description: string | null
  thumbnailUrl: string | null
  uploader: string | null
  durationSeconds: number | null
  playlist: PlaylistInfo | null
  formats: MediaFormat[]
}

export type OutputMode = 'video-audio' | 'audio-only' | 'video-only' | 'best-available'

export type AudioFormat = 'mp3' | 'm4a' | 'opus' | 'wav'

export type DownloadRequest = {
  mediaUrl: string
  outputMode: OutputMode
  formatId: string | null
  outputPath: string
  audioFormat: AudioFormat | null
}

export type DownloadStage =
  | 'preparing'
  | 'downloading'
  | 'merging'
  | 'converting'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type DownloadProgress = {
  downloadId: string
  stage: DownloadStage
  percent: number | null
  downloadedBytes: number | null
  totalBytes: number | null
  speedBytesPerSecond: number | null
  etaSeconds: number | null
  outputPath: string
}

export type DownloadResult = {
  downloadId: string
  outputPath: string
  fileSizeBytes: number | null
}

export type AppErrorCode =
  | 'invalid-input'
  | 'invalid-url'
  | 'unsupported-url'
  | 'media-unavailable'
  | 'authentication-required'
  | 'network-error'
  | 'format-unavailable'
  | 'ffmpeg-missing'
  | 'processing-failed'
  | 'destination-error'
  | 'file-exists'
  | 'cancelled'
  | 'download-failed'
  | 'internal-error'

export type AppError = {
  code: AppErrorCode
  message: string
  retryable: boolean
}

export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError }

export type DownloadStart = {
  downloadId: string
}

export type DownloadStatus = {
  downloadId: string
  stage: DownloadStage
  error: AppError | null
  result: DownloadResult | null
}
