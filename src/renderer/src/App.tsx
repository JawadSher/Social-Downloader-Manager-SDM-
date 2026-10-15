import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Link2,
  ClipboardPaste,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Download,
} from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function App() {
  const [theme, setTheme] = useState<Theme>('system')
  const [url, setUrl] = useState('')
  const [clipboardMessage, setClipboardMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const handlePaste = async () => {
    setClipboardMessage('')
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        setClipboardMessage('Clipboard is empty.')
        return
      }
      setUrl(text.trim())
      setClipboardMessage('Pasted from clipboard.')
    } catch {
      setClipboardMessage(
        'Clipboard access was blocked by the browser. Press Ctrl + V to paste manually.'
      )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text)] antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-surface-raised)] focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-[var(--color-focus)]"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-background-soft)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w- items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text- font-semibold tracking-wide"
            >
              SDM
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">
                Social Downloader Manager
              </p>
              <p className="text- font-medium text-[var(--color-text-muted)]">
                Windows desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[var(--color-text-subtle)] sm:inline">
              Theme
            </span>
            <div
              role="group"
              aria-label="Theme selector"
              className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
            >
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isActive = theme === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isActive? 'default' : 'ghost'}
                    size="sm"
                    aria-pressed={isActive}
                    aria-label={`Switch to ${opt.label} theme`}
                    onClick={() => setTheme(opt.value)}
                    className={
                      isActive
                       ? 'h-7 rounded-full bg-[var(--color-accent)] px-3 text- font-medium text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)]'
                        : 'h-7 rounded-full px-3 text- font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                    }
                  >
                    <Icon className="mr-1 size-3.5" />
                    {opt.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w- flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8"
      >
        {/* URL Card */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-">
                  <Link2 className="size-4 text-[var(--color-text-muted)]" />
                  Source URL
                </CardTitle>
                <CardDescription className="text- leading-relaxed text-[var(--color-text-muted)]">
                  Paste a supported link. Inspection and downloading are not
                  implemented yet.
                </CardDescription>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-2.5 py-1 text- font-medium text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border-subtle)] sm:inline-flex">
                <span className="size-1.5 rounded-full bg-[var(--color-warning)]" />
                Inspect disabled
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="source-url"
                className="text- font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]"
              >
                URL
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Input
                    id="source-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (clipboardMessage) setClipboardMessage('')
                    }}
                    placeholder="https://..."
                    className="h-11 border-[var(--color-border)] bg-[var(--color-background)] pl-3 pr-3 text- placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-focus)] focus-visible:ring-[var(--color-focus)]/30"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePaste}
                    className="h-11 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-raised)] text- hover:bg-[var(--color-surface-hover)]"
                  >
                    <ClipboardPaste className="size-4" />
                    Paste
                  </Button>
                  <Button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Inspection will be connected in a later step"
                    className="h-11 shrink-0 bg-[var(--color-accent)] px-6 text- font-semibold text-[var(--color-accent-contrast)] opacity-50"
                  >
                    <Download className="size-4" />
                    Inspect
                  </Button>
                </div>
              </div>

              <p
                role="status"
                aria-live="polite"
                className="min-h-5 text-xs leading-relaxed text-[var(--color-text-muted)]"
              >
                {clipboardMessage? (
                  clipboardMessage
                ) : (
                  <span className="text-[var(--color-text-subtle)]">
                    Paste uses{' '}
                    <code className="rounded bg-[var(--color-background-soft)] px-1 py-0.5 font-mono text- ring-1 ring-inset ring-[var(--color-border-subtle)]">
                      navigator.clipboard.readText()
                    </code>{' '}
                    only when you click Paste.
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">
                Inspect is disabled
              </span>{' '}
              — this screen only collects the URL. No network request is made.
              Validation, media preview, and download logic will be wired later.
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Preview */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text- font-semibold">
                Media Preview
              </CardTitle>
              <span className="text- text-[var(--color-text-subtle)]">
                Empty state
              </span>
            </CardHeader>
            <Separator className="bg-[var(--color-border-subtle)]" />
            <CardContent className="p-5">
              <div className="flex min-h- flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-10 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border-subtle)]">
                  <ImageIcon className="size-5" />
                </div>
                <p className="text-sm font-medium">No media inspected yet</p>
                <p className="mt-1 max-w- text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Title, thumbnail, and available streams will appear here after
                  inspection is implemented.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            {/* Output Settings */}
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="pb-4">
                <CardTitle className="text- font-semibold">
                  Output Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose mode and quality after inspection
                </CardDescription>
              </CardHeader>
              <Separator className="bg-[var(--color-border-subtle)]" />
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <label className="text- font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    Output mode
                  </label>
                  <Select disabled>
                    <SelectTrigger className="h-11 border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] text-[var(--color-text-subtle)]">
                      <SelectValue placeholder="Available after inspection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">
                        Available after inspection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text- font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    Format & quality
                  </label>
                  <Select disabled>
                    <SelectTrigger className="h-11 border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] text-[var(--color-text-subtle)]">
                      <SelectValue placeholder="Available after inspection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">
                        Available after inspection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text- leading-relaxed text-[var(--color-text-subtle)]">
                    Format options will be populated from the inspected media.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Download Status */}
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text- font-semibold">
                  <Download className="size-4 text-[var(--color-text-muted)]" />
                  Download Status
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[var(--color-border-subtle)]" />
              <CardContent className="p-5">
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] p-4">
                  <p className="text-sm font-medium text-[var(--color-text-muted)]">
                    No active download
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-subtle)]">
                    Queue, destination folder, and controls will appear here
                    once downloading is implemented. Progress will only be shown
                    during a real download.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w- flex-col gap-3 border-t border-[var(--color-border-subtle)] px-4 py-5 text-xs text-[var(--color-text-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>First-screen UI only — inspection and downloads coming next.</p>
      </footer>
    </div>
  )
}