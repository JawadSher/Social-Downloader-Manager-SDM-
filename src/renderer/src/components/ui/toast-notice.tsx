import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { JSX } from 'react'

export type ToastKind = 'success' | 'warning' | 'error'

export type ToastMessage = {
  id: number
  kind: ToastKind
  message: string
}

type ToastNoticeProps = {
  toast: ToastMessage
  onDismiss: () => void
}

const TOAST_PRESENTATION = {
  success: { icon: CheckCircle2, label: 'Success', border: 'border-emerald-500/40' },
  warning: { icon: Info, label: 'Notice', border: 'border-amber-500/40' },
  error: { icon: CircleAlert, label: 'Error', border: 'border-[var(--color-danger)]/50' }
} satisfies Record<ToastKind, { icon: typeof Info; label: string; border: string }>

export function ToastNotice({ toast, onDismiss }: ToastNoticeProps): JSX.Element {
  const presentation = TOAST_PRESENTATION[toast.kind]
  const Icon = presentation.icon

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border ${presentation.border} bg-[var(--color-surface-raised)] p-4 text-sm text-[var(--color-text)] shadow-xl`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{presentation.label}</p>
        <p className="mt-1 break-words text-[var(--color-text-muted)]">{toast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="-mr-1 -mt-1 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
