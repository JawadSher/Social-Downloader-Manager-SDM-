import { describe, expect, it } from 'vitest'
import { classifyYtDlpDiagnostic } from './diagnostic-classifier'

describe('classifyYtDlpDiagnostic', () => {
  it.each([
    ['Unsupported URL: example.invalid/item', 'unsupported-url'],
    ['Sign in to confirm your age', 'authentication-required'],
    ['Requested format is not available', 'format-unavailable'],
    ['This video is private', 'media-unavailable'],
    ['Unable to download webpage: connection timed out', 'network-error'],
    ['ffmpeg exited with code 1 during postprocessing', 'processing-error']
  ] as const)('classifies %s as %s', (diagnostic, expected) => {
    expect(classifyYtDlpDiagnostic(diagnostic)).toBe(expected)
  })

  it('returns null when the diagnostic does not identify a known failure', () => {
    expect(classifyYtDlpDiagnostic('Unexpected extractor response')).toBeNull()
    expect(classifyYtDlpDiagnostic(null)).toBeNull()
  })
})
