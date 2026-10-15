import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { AppError, OperationResult } from '../../shared/contracts'
import type { InvokeChannel } from '../../shared/ipc-channels'
import type { ValidationResult } from '../../shared/schemas'

type ArgumentParser<Args extends unknown[]> = (args: unknown[]) => ValidationResult<Args>

function errorResult<T>(error: AppError): OperationResult<T> {
  return { success: false, error }
}

export function registerIpcHandler<Args extends unknown[], Result>(
  channel: InvokeChannel,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean,
  parseArgs: ArgumentParser<Args>,
  handler: (...args: Args) => Result | Promise<Result>
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<OperationResult<Result>> => {
    if (!isTrustedSender(event)) {
      return errorResult({
        code: 'invalid-input',
        message: 'This request source is not allowed.',
        retryable: false
      })
    }

    const parsed = parseArgs(args)
    if (!parsed.success) {
      return errorResult({
        code: 'invalid-input',
        message: parsed.error,
        retryable: false
      })
    }

    try {
      return { success: true, data: await handler(...parsed.data) }
    } catch {
      return errorResult({
        code: 'internal-error',
        message: 'The request could not be completed.',
        retryable: true
      })
    }
  })
}
