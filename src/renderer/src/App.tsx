import { JSX, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/*
 * Layout notes
 * - No margin utilities (mt-*, mb-*, mx-auto, space-*): spacing comes from
 *   flex/grid `gap` and padding, so a global `* { margin: 0 }` reset can't break it.
 * - Font weights use the `!` modifier so a global `font-weight: normal` reset
 *   can't flatten them.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]";

// Fluid container: grows with the window up to a wide cap, padding scales too.
const container = "w-full max-w-[1440px] px-4 sm:px-6 lg:px-8";

const card =
  "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]";

const cardPadding = "p-4 sm:p-5 lg:p-6";

function LinkIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.75 9.25a2.5 2.5 0 0 0 3.536 0l2-2a2.5 2.5 0 0 0-3.536-3.536l-.75.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 6.75a2.5 2.5 0 0 0-3.536 0l-2 2a2.5 2.5 0 0 0 3.536 3.536l.75-.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipboardIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="3"
        width="9"
        height="10.5"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6 3V2.75c0-.414.336-.75.75-.75h2.5c.414 0 .75.336.75.75V3"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function ImageIcon(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="14"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3.5 13.5 7 10l4.5 4.5M12.5 12l2 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>("system");
  const [url, setUrl] = useState<string>("");
  const [clipboardMessage, setClipboardMessage] = useState<string>("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handlePaste = async (): Promise<void> => {
    setClipboardMessage("");
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setClipboardMessage("Clipboard is empty.");
        return;
      }
      setUrl(text.trim());
      setClipboardMessage("Pasted from clipboard.");
    } catch {
      setClipboardMessage(
        "Clipboard access was blocked. Paste manually with Ctrl + V."
      );
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-text)] antialiased selection:bg-[var(--color-accent)] selection:text-[var(--color-accent-contrast)]">
      {/* Header */}
      <header className="flex w-full shrink-0 justify-center border-b border-[var(--color-border-subtle)] bg-[var(--color-background)]">
        <div className={`${container} flex h-14 items-center justify-between gap-3`}>
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[10px] !font-semibold tracking-wide"
            >
              SDM
            </div>
            <span className="truncate text-sm !font-semibold tracking-tight">
              Social Downloader Manager
            </span>
          </div>

          <div
            role="group"
            aria-label="Theme"
            className="flex shrink-0 gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
          >
            {THEME_OPTIONS.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setTheme(opt.value)}
                  className={[
                    "rounded-full px-2.5 py-1 text-xs !font-medium transition-colors sm:px-3 sm:text-sm",
                    focusRing,
                    isActive
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/*
        Main fills the remaining window height.
        - From lg up: fixed height, no page scroll; the preview/settings row flexes to fit.
        - Below lg (stacked layout): main scrolls on its own, header stays put.
      */}
      <main className="min-h-0 w-full flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="flex min-h-full w-full justify-center lg:h-full">
          <div
            className={`${container} flex flex-1 flex-col gap-4 py-5 sm:gap-5 sm:py-6`}
          >
          {/* Intro */}
          <div className="flex max-w-3xl shrink-0 flex-col gap-1.5">
            <h1 className="text-2xl !font-semibold tracking-tight sm:text-3xl">
              Download from a link
            </h1>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Paste a link to see what is available to download. Choose a format
              and quality, then save it to your device.
            </p>
          </div>

          {/* URL input */}
          <section
            aria-labelledby="url-label"
            className={`${card} ${cardPadding} flex shrink-0 flex-col gap-3`}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <label
                id="url-label"
                htmlFor="source-url"
                className="text-sm !font-medium"
              >
                Link
              </label>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]"
                />
                Inspect is not connected yet
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--color-text-subtle)]">
                  <LinkIcon />
                </div>
                <input
                  id="source-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (clipboardMessage) setClipboardMessage("");
                  }}
                  placeholder="https://"
                  className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-3 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)] sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  onClick={handlePaste}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm !font-medium transition-colors hover:bg-[var(--color-surface-hover)] sm:px-5 ${focusRing}`}
                >
                  <ClipboardIcon />
                  Paste
                </button>
                <button
                  type="button"
                  disabled
                  title="Inspecting links is not available yet"
                  className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-lg bg-[var(--color-accent)] px-6 text-sm !font-semibold text-[var(--color-accent-contrast)] opacity-50 sm:px-8"
                >
                  Inspect
                </button>
              </div>
            </div>

            {/* Reserved line so the card doesn't jump when a message appears */}
            <p
              role="status"
              aria-live="polite"
              className="min-h-4 text-xs leading-4 text-[var(--color-text-muted)]"
            >
              {clipboardMessage}
            </p>
          </section>

          {/* Preview + download settings: stacked on small windows, side by side from lg */}
          <div className="grid flex-1 gap-4 sm:gap-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <section
              aria-labelledby="preview-title"
              className={`${card} ${cardPadding} flex flex-col gap-4 lg:min-h-0`}
            >
              <h2 id="preview-title" className="text-sm !font-semibold">
                Preview
              </h2>
              <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-8 text-center lg:aspect-auto lg:min-h-0 lg:flex-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-subtle)]">
                  <ImageIcon />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm !font-medium">Nothing to preview yet</p>
                  <p className="max-w-xs text-xs leading-relaxed text-[var(--color-text-muted)] sm:text-sm">
                    The title, thumbnail and available formats will show up
                    here after you inspect a link.
                  </p>
                </div>
              </div>
            </section>

            <aside
              aria-label="Download settings"
              className={`${card} flex flex-col divide-y divide-[var(--color-border-subtle)] lg:min-h-0 lg:overflow-y-auto`}
            >
              <section
                aria-labelledby="output-title"
                className={`${cardPadding} flex flex-col gap-4`}
              >
                <h2 id="output-title" className="text-sm !font-semibold">
                  Output
                </h2>

                <div
                  role="group"
                  aria-labelledby="type-label"
                  className="flex flex-col gap-2"
                >
                  <span
                    id="type-label"
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    Type
                  </span>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    <button
                      type="button"
                      disabled
                      className="flex cursor-not-allowed flex-col rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-3 py-2.5 text-left opacity-60"
                    >
                      <span className="text-sm !font-medium">Video</span>
                      <span className="text-xs text-[var(--color-text-subtle)]">
                        With audio
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex cursor-not-allowed flex-col rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-3 py-2.5 text-left opacity-60"
                    >
                      <span className="text-sm !font-medium">Audio</span>
                      <span className="text-xs text-[var(--color-text-subtle)]">
                        Audio only
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="format"
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    Format and quality
                  </label>
                  <select
                    id="format"
                    disabled
                    className="h-11 w-full cursor-not-allowed rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-3 text-sm text-[var(--color-text-subtle)]"
                  >
                    <option>Available after inspection</option>
                  </select>
                </div>
              </section>

              <section
                aria-labelledby="progress-title"
                className={`${cardPadding} flex flex-1 flex-col gap-4`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id="progress-title" className="text-sm !font-semibold">
                    Progress
                  </h2>
                  <span className="text-xs text-[var(--color-text-subtle)]">
                    0%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Download progress"
                  aria-valuenow={0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-background-soft)]"
                >
                  <div className="h-full w-0 rounded-full bg-[var(--color-accent)]" />
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  No active download. Speed, time left and the save location
                  will appear here.
                </p>
              </section>
            </aside>
          </div>

          {/* Footer */}
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[var(--color-border-subtle)] pt-4">
            <p className="text-xs text-[var(--color-text-subtle)]">
              Inspecting and downloading are coming in the next step.
            </p>
          </footer>
          </div>
        </div>
      </main>
    </div>
  );
}