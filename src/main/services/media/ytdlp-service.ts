import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import { getYtDlpPath } from './binary-availability'

const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000
const MAX_STDOUT_BYTES = 16 * 1024 * 1024
const MAX_STDERR_BYTES = 1024 * 1024
const MAX_TIMEOUT_MS = 30 * 60 * 1000
const MAX_REQUEST_ID_LENGTH = 128
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export type YtDlpProcessResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type YtDlpProcessOptions = {
  requestId: string
  timeoutMs?: number
  maxStdoutBytes?: number
  maxStderrBytes?: number
  onStdoutLine?: (line: string) => void
}

export type YtDlpProcessErrorCode =
  | 'invalid-request'
  | 'already-running'
  | 'spawn-failed'
  | 'process-failed'
  | 'output-limit'
  | 'timeout'
  | 'cancelled'

export class YtDlpProcessError extends Error {
  constructor(
    readonly code: YtDlpProcessErrorCode,
    message: string,
    readonly diagnostic: string | null = null,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'YtDlpProcessError'
  }
}

type ActiveProcess = {
  argsKey: string
  promise: Promise<YtDlpProcessResult>
  cancel: () => void
}

const activeProcesses = new Map<string, ActiveProcess>()

/**
 * Runs yt-dlp with fixed executable resolution and argument-array spawning.
 * Calls with the same request ID and arguments share the active operation.
 */
export function runYtDlp(
  args: readonly string[],
  options: YtDlpProcessOptions
): Promise<YtDlpProcessResult> {
  const validationError = validateOptions(args, options)
  if (validationError) return Promise.reject(validationError)

  const argsKey = JSON.stringify(args)
  const existing = activeProcesses.get(options.requestId)
  if (existing) {
    if (existing.argsKey === argsKey) return existing.promise
    return Promise.reject(
      new YtDlpProcessError(
        'already-running',
        'A different yt-dlp request is already running with this identifier.'
      )
    )
  }

  let operation: ActiveProcess
  try {
    operation = startYtDlpProcess(args, options, argsKey)
  } catch (error) {
    return Promise.reject(
      error instanceof YtDlpProcessError
        ? error
        : new YtDlpProcessError('spawn-failed', 'yt-dlp could not be started.', null, {
            cause: error
          })
    )
  }

  activeProcesses.set(options.requestId, operation)
  const removeActiveProcess = (): void => {
    if (activeProcesses.get(options.requestId) === operation) {
      activeProcesses.delete(options.requestId)
    }
  }
  void operation.promise.then(removeActiveProcess, removeActiveProcess)

  return operation.promise
}

/** Stop a running yt-dlp operation identified by its caller-owned request ID. */
export function cancelYtDlp(requestId: string): boolean {
  if (!isValidRequestId(requestId)) return false
  const active = activeProcesses.get(requestId)
  if (!active) return false
  active.cancel()
  return true
}

function validateOptions(
  args: readonly string[],
  options: YtDlpProcessOptions
): YtDlpProcessError | null {
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) {
    return new YtDlpProcessError('invalid-request', 'yt-dlp arguments must be strings.')
  }
  if (!options || !isValidRequestId(options.requestId)) {
    return new YtDlpProcessError('invalid-request', 'The yt-dlp request identifier is invalid.')
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
    return new YtDlpProcessError('invalid-request', 'The yt-dlp timeout is invalid.')
  }

  const stdoutLimit = options.maxStdoutBytes ?? MAX_STDOUT_BYTES
  const stderrLimit = options.maxStderrBytes ?? MAX_STDERR_BYTES
  if (
    !Number.isSafeInteger(stdoutLimit) ||
    stdoutLimit <= 0 ||
    stdoutLimit > MAX_STDOUT_BYTES ||
    !Number.isSafeInteger(stderrLimit) ||
    stderrLimit <= 0 ||
    stderrLimit > MAX_STDERR_BYTES
  ) {
    return new YtDlpProcessError('invalid-request', 'The yt-dlp output limits are invalid.')
  }

  return null
}

function isValidRequestId(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(value)
  )
}

function startYtDlpProcess(
  args: readonly string[],
  options: YtDlpProcessOptions,
  argsKey: string
): ActiveProcess {
  const stdoutLimit = options.maxStdoutBytes ?? MAX_STDOUT_BYTES
  const stderrLimit = options.maxStderrBytes ?? MAX_STDERR_BYTES
  let child: ChildProcessByStdio<null, Readable, Readable>

  try {
    child = spawn(getYtDlpPath(), [...args], {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (error) {
    throw new YtDlpProcessError('spawn-failed', 'yt-dlp could not be started.', null, {
      cause: error
    })
  }

  const operation: ActiveProcess = {
    argsKey,
    promise: Promise.resolve({ stdout: '', stderr: '', exitCode: -1 }),
    cancel: () => undefined
  }

  operation.promise = new Promise<YtDlpProcessResult>((resolve, reject) => {
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')
    let stdout = ''
    let stdoutPending = ''
    let stderr = ''
    let stdoutBytes = 0
    let stderrBytes = 0
    let settled = false
    let terminalError: YtDlpProcessError | null = null

    const timer = setTimeout(() => {
      terminate(new YtDlpProcessError('timeout', 'yt-dlp did not finish before the timeout.'))
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    timer.unref?.()

    const settleError = (error: YtDlpProcessError): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    }

    const terminate = (error: YtDlpProcessError): void => {
      if (terminalError || settled) return
      terminalError = error
      child.kill()
    }

    const consumeStdoutLines = (chunk: string, flush = false): void => {
      stdoutPending += chunk
      const lines = stdoutPending.split(/\r?\n/)
      stdoutPending = flush ? '' : (lines.pop() ?? '')
      if (flush && lines.at(-1) === '') lines.pop()
      for (const line of lines) {
        try {
          options.onStdoutLine?.(line)
        } catch {
          // Progress observers must not interfere with the yt-dlp process.
        }
      }
      if (flush && stdoutPending) {
        try {
          options.onStdoutLine?.(stdoutPending)
        } catch {
          // Progress observers must not interfere with the yt-dlp process.
        }
        stdoutPending = ''
      }
    }

    operation.cancel = () => {
      terminate(new YtDlpProcessError('cancelled', 'The yt-dlp request was cancelled.'))
    }

    child.stdout.on('data', (chunk: Buffer) => {
      if (settled || terminalError) return
      stdoutBytes += chunk.length
      if (stdoutBytes > stdoutLimit) {
        terminate(
          new YtDlpProcessError(
            'output-limit',
            'yt-dlp produced too much output.',
            redactSensitiveUrlParameters(stderr)
          )
        )
        return
      }
      const decoded = stdoutDecoder.write(chunk)
      stdout += decoded
      consumeStdoutLines(decoded)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      if (settled || terminalError) return
      stderrBytes += chunk.length
      if (stderrBytes > stderrLimit) {
        terminate(
          new YtDlpProcessError(
            'output-limit',
            'yt-dlp produced too much diagnostic output.',
            redactSensitiveUrlParameters(stderr)
          )
        )
        return
      }
      stderr += stderrDecoder.write(chunk)
    })

    child.once('error', (error) => {
      settleError(
        new YtDlpProcessError('spawn-failed', 'yt-dlp could not be started.', null, {
          cause: error
        })
      )
    })

    child.once('close', (exitCode, signal) => {
      const stdoutTail = stdoutDecoder.end()
      stdout += stdoutTail
      consumeStdoutLines(stdoutTail, true)
      stderr += stderrDecoder.end()

      if (terminalError) {
        settleError(terminalError)
        return
      }
      if (exitCode !== 0) {
        settleError(
          new YtDlpProcessError(
            'process-failed',
            signal
              ? `yt-dlp stopped after receiving ${signal}.`
              : `yt-dlp exited with code ${exitCode ?? 'unknown'}.`,
            redactSensitiveUrlParameters(stderr)
          )
        )
        return
      }

      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ stdout, stderr: redactSensitiveUrlParameters(stderr), exitCode })
    })
  })

  return operation
}

function redactSensitiveUrlParameters(text: string): string {
  return text.replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
    try {
      const url = new URL(candidate)
      for (const key of url.searchParams.keys()) {
        url.searchParams.set(key, '[REDACTED]')
      }
      if (url.hash) url.hash = '#[REDACTED]'
      return url.href
    } catch {
      return candidate.replace(/[?#].*$/, '?[REDACTED]')
    }
  })
}
