import type { DownloadProgress, DownloadStage } from '../../../shared/contracts'

const DOWNLOAD_PROGRESS_PREFIX = 'SDM_PROGRESS:'
const POSTPROCESS_PROGRESS_PREFIX = 'SDM_POSTPROCESS:'

function parseMetric(value: string | undefined): number | null {
  if (!value || value === 'NA') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function parseYtDlpProgressLine(
  line: string,
  downloadId: string,
  outputPath: string,
  isAudioConversion: boolean
): DownloadProgress | null {
  if (line.startsWith(DOWNLOAD_PROGRESS_PREFIX)) {
    const [status, downloadedText, totalText, estimateText, speedText, etaText] = line
      .slice(DOWNLOAD_PROGRESS_PREFIX.length)
      .split('|')
    if (status !== 'downloading' && status !== 'finished') return null

    const downloadedBytes = parseMetric(downloadedText)
    const totalBytes = parseMetric(totalText) ?? parseMetric(estimateText)
    const percent = downloadedBytes !== null && totalBytes !== null && totalBytes > 0
      ? Math.min(100, (downloadedBytes / totalBytes) * 100)
      : null

    return {
      downloadId,
      stage: 'downloading',
      percent,
      downloadedBytes,
      totalBytes,
      speedBytesPerSecond: parseMetric(speedText),
      etaSeconds: parseMetric(etaText),
      outputPath
    }
  }

  if (line.startsWith(POSTPROCESS_PROGRESS_PREFIX)) {
    const [status, postprocessor = ''] = line.slice(POSTPROCESS_PROGRESS_PREFIX.length).split('|')
    if (status !== 'started' && status !== 'processing') return null

    const stage: DownloadStage = isAudioConversion && /extractaudio/i.test(postprocessor)
      ? 'converting'
      : 'merging'
    return {
      downloadId,
      stage,
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
      speedBytesPerSecond: null,
      etaSeconds: null,
      outputPath
    }
  }

  return null
}
