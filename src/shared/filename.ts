import type { MediaFormat } from './contracts'

const MAX_FILENAME_LENGTH = 255
// Windows forbids control characters in path components.
// eslint-disable-next-line no-control-regex
const WINDOWS_INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\x00-\x1f]/g
const WINDOWS_RESERVED_FILENAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

export function getFormatExtension(format: MediaFormat | null): string | null {
  if (!format) return null

  const extension = format.extension.trim().replace(/^\.+/, '').toLowerCase()
  return /^[a-z0-9]{1,10}$/.test(extension) && extension !== 'unknown' ? extension : null
}

export function sanitizeFilenameStem(value: string, extension: string | null): string {
  let stem = value.replace(WINDOWS_INVALID_FILENAME_CHARACTERS, '_').replace(/[. ]+$/g, '')

  if (WINDOWS_RESERVED_FILENAME.test(stem)) stem = '_' + stem

  const extensionLength = extension ? extension.length + 1 : 0
  const maximumStemLength = MAX_FILENAME_LENGTH - extensionLength
  const characters = Array.from(stem)

  while (characters.join('').length > maximumStemLength) characters.pop()

  return characters.join('')
}
