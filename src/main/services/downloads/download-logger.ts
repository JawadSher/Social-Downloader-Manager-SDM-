type LogDetails = Record<string, string | number | boolean | null>

/** Writes structured local diagnostics without exposing URLs, tokens, or local paths. */
export function logDownloadEvent(
  downloadId: string,
  event: string,
  details: LogDetails = {},
  level: 'info' | 'error' = 'info'
): void {
  const entry = JSON.stringify({ scope: 'sdm-download', downloadId, event, ...details })
  console[level](`[SDM] ${entry}`)
}

export function sanitizeDiagnosticForLog(diagnostic: string | null): string | null {
  if (!diagnostic) return null

  return diagnostic
    .replace(/\b(authorization|proxy-authorization|cookie|set-cookie)\s*[:=]\s*[^\r\n]*/gi, '$1: [REDACTED]')
    .replace(/\b(access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret)\s*[=:]\s*[^\s&,;]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL REDACTED]')
    .replace(/\b[A-Z]:\\[^\s"'<>]+/gi, '[PATH REDACTED]')
    .replace(/\\\\[^\s"'<>]+/g, '[PATH REDACTED]')
    .slice(0, 2_000)
}
