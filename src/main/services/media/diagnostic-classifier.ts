export type YtDlpFailureCategory =
  | 'unsupported-url'
  | 'authentication-required'
  | 'format-unavailable'
  | 'media-unavailable'
  | 'network-error'
  | 'processing-error'

/** Classifies redacted yt-dlp stderr without exposing it to the renderer. */
export function classifyYtDlpDiagnostic(diagnostic: string | null): YtDlpFailureCategory | null {
  const text = diagnostic?.toLowerCase() ?? ''
  if (!text) return null

  if (/unsupported url|no suitable extractor|no extractor found/.test(text)) return 'unsupported-url'
  if (/sign in|login required|authentication|cookies required|members.only/.test(text)) {
    return 'authentication-required'
  }
  if (/requested format.*not available|no video formats|no formats found/.test(text)) {
    return 'format-unavailable'
  }
  if (/private|video unavailable|has been removed|not available in your country|geo.?restricted/.test(text)) {
    return 'media-unavailable'
  }
  if (/ffmpeg|merger|post.?process/.test(text)) return 'processing-error'
  if (/unable to download|timed? out|connection|temporary failure|name or service not known|network|http error/.test(text)) {
    return 'network-error'
  }
  return null
}
