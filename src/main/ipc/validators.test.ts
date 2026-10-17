import { describe, expect, it } from 'vitest'
import type { MediaFormat } from '../../shared/contracts'
import { parseInspectionArgs } from './validators'
import { validateFormatSelection } from './validators'

const availableFormat: MediaFormat = {
  formatId: 'combined-1080',
  extension: 'mp4',
  resolution: '1920x1080',
  width: 1920,
  height: 1080,
  framesPerSecond: 30,
  videoCodec: 'avc1',
  audioCodec: 'mp4a',
  hasVideo: true,
  hasAudio: true,
  fileSizeBytes: null,
  approximateFileSizeBytes: null,
  note: null
}

describe('parseInspectionArgs', () => {
  it.each([
    ['', 'Enter a URL.'],
    ['not a URL', 'Enter a valid URL.'],
    ['file:///C:/private/video.mp4', 'URL must use HTTP or HTTPS.']
  ])('rejects invalid input %j', (url, error) => {
    expect(parseInspectionArgs(['request-1', url])).toEqual({ success: false, error })
  })

  it('accepts a valid HTTP(S) URL', () => {
    expect(parseInspectionArgs(['request-1', 'https://example.com/video'])).toEqual({
      success: true,
      data: ['request-1', 'https://example.com/video']
    })
  })
})

describe('validateFormatSelection', () => {
  it('rejects a requested quality that was not returned by inspection', () => {
    expect(validateFormatSelection('720p', 'video-audio', [availableFormat])).toEqual({
      success: false,
      error: 'Selected format was not returned for this media.'
    })
  })

  it('rejects video-only mode when the selected format contains audio', () => {
    expect(validateFormatSelection('combined-1080', 'video-only', [availableFormat])).toEqual({
      success: false,
      error: 'Selected format is not video-only.'
    })
  })

  it('rejects video-only mode when no format was selected', () => {
    expect(validateFormatSelection(null, 'video-only', [availableFormat])).toEqual({
      success: false,
      error: 'Choose an available video-only format.'
    })
  })
})
