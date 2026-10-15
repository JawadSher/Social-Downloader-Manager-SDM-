# Social Downloader Manager (SDM) --- Windows Media Downloader Project Plan

> **Status:** Planning\
> **Working name:** Social Downloader Manager (SDM) (temporary; check trademarks, domain, and
> package-name availability before public release)\
> **Platform:** Windows 10/11, x64 first\
> **Product:** A lightweight, media-first desktop downloader powered by
> `yt-dlp` and FFmpeg\
> **Build approach:** AI coding agent implements one small milestone at
> a time; each milestone is tested before the plan is marked complete.

------------------------------------------------------------------------

## 1. Product goal

Build a clean Windows desktop app where a user pastes a video, audio, or
playlist URL, the app inspects the URL, identifies the platform/content
type when possible, previews the media information and available
formats, and then downloads the chosen output to a location selected by
the user.

### Keep the app deliberately simple

-   No database.
-   No download history.
-   No accounts, cloud sync, or backend server.
-   No persistent metadata library.
-   No complex settings screen.
-   Only a simple **Light / Dark / System theme** choice.
-   Ask the user where to save the output, using a native Windows Save
    dialog.
-   Let the user edit the suggested output filename before downloading.
-   Show progress and the current download status while the app is open.
-   After a job finishes, allow opening the saved file or its containing
    folder.
-   Do not promise that every website or URL will work.

### Main workflow

1.  User pastes a URL.
2.  App validates the URL format and starts a metadata/format inspection
    ("Fetching media information...").
3.  `yt-dlp` attempts to identify the extractor/platform and retrieve
    available media information.
4.  App shows the detected site, content type (single video/audio item
    or playlist where detectable), title, thumbnail, uploader/channel
    name and available formats when provided by the extractor.
5.  App shows the available resolution/format options and lets the user
    choose an output mode.
6.  User chooses output filename and destination through a native Save
    dialog.
7.  User confirms Download.
8.  App downloads, shows progress/speed/ETA when available, and reports
    success or a useful error.
9.  User can open the file or its folder.

**Important:** Do not save a persistent history or database record.
Temporary in-memory state for the current session is fine. Do not claim
a download can always be resumed after closing the app; there is no
persistent job store, and resume depends on the source and downloader
behavior.

------------------------------------------------------------------------

## 2. Technology stack

Use TypeScript as the primary application language.

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Desktop shell           Electron                Windows desktop window,
                                                  native dialogs, app
                                                  lifecycle

  UI                      React + TypeScript      URL entry, preview,
                                                  format choices,
                                                  progress, errors

  Styling                 Tailwind CSS            UI styling and theme
                                                  tokens

  Dev/build               Vite + a maintained     Development and
                          Electron starter        renderer bundling

  Media                   `yt-dlp.exe`            Identify supported
  extractor/downloader                            media URLs, inspect
                                                  formats, download media

  Post-processing         FFmpeg + optionally     Merge separate streams,
                          ffprobe                 convert audio, inspect
                                                  output streams

  Main process            Node.js + TypeScript    Run binaries, open Save
                                                  dialog, manage progress
                                                  and errors

  Validation              Zod or equivalent       Validate IPC inputs and
                                                  options

  Tests                   Vitest + React Testing  Verify logic and core
                          Library + Electron      workflows
                          smoke tests             

  Packaging               Electron Forge or       Package Windows
                          Electron Builder        application/installer
  -----------------------------------------------------------------------

Use compatible, maintained versions and pin them in the lockfile. Before
bundling `yt-dlp.exe`, FFmpeg, or any other third-party binary, verify
the current license, redistribution conditions, source, version, and
integrity.

### Architecture/security rules

-   `yt-dlp`, FFmpeg, filesystem operations, and process spawning must
    run in Electron's main process or a controlled utility process---not
    in the React renderer.
-   Enable `contextIsolation: true` and `nodeIntegration: false`.
-   Use a restrictive Content Security Policy.
-   Expose only a small, typed preload API; never expose raw Node APIs
    or unrestricted IPC to the renderer.
-   Validate every IPC request in the main process.
-   Spawn processes with argument arrays, not shell-interpolated command
    strings.
-   Never log cookies, authorization headers, signed URLs, or secrets.
-   Do not load arbitrary remote webpages inside a privileged Electron
    window.

------------------------------------------------------------------------

## 3. Name and visual direction

Use **Social Downloader Manager (SDM)** as a working name.

Visual direction: - Minimal, polished, Windows-first design. - Dark and
light themes, plus optional "Use system theme". - Theme toggle visible
in the main interface; no complex settings page. - Clear preview card,
format picker, Save dialog, progress bar, and status messages. -
Accessible contrast, visible keyboard focus, and keyboard navigation. -
Avoid clutter and unnecessary panels.

------------------------------------------------------------------------

## 4. Features

### 4.1 URL input and detection

-   Paste a URL from the clipboard or type it.
-   Validate that the input is a URL and uses an allowed protocol
    (normally HTTPS/HTTP as needed).
-   Show a loading state while inspecting the URL.
-   Ask `yt-dlp` to inspect the URL and determine the extractor/platform
    when possible.
-   Display the extractor/platform name returned by `yt-dlp`, rather
    than maintaining an unreliable hand-written list of every supported
    site.
-   Detect single-item versus playlist/multi-item content where the
    extractor provides this information.
-   For a playlist, show the playlist title and available entries if
    supported; allow the user to choose a specific item or download the
    playlist.
-   If the URL is malformed, unsupported, inaccessible, private,
    region-restricted, or requires unavailable authentication, show a
    clear message.
-   Provide a Retry action where retrying may help.
-   Do not bypass DRM, paywalls, or access controls.

**Platform identification limitation:** yt-dlp supports a large and
changing set of extractors. Some URLs are recognized only partially, and
some websites change frequently. The UI should say "Platform detected:
\[extractor/site name\]" only when supported by extraction results.
Otherwise show "Couldn't identify this platform" or a relevant
error---not a guessed platform.

### 4.2 Prefetch / inspect before download

When the user submits a URL, inspect it first; do not immediately start
downloading.

Show a preview card using the information that is actually available: -
Video/media title. - Thumbnail. - Website/platform or extractor name. -
Uploader/channel/creator name. - Channel/avatar/logo only if the
extractor actually provides a suitable image URL. Do not assume a
channel logo will always be available. - Duration when available. -
Playlist name and item count for playlists, when available. - Available
resolutions and formats. - Maximum available video resolution from the
extracted formats, if a real video format reports it. - Audio presence
and audio formats when available. - File size only when reported or
estimable; label estimates clearly. - Helpful note if video and audio
are separate streams and need merging.

The app must distinguish "metadata inspection complete" from "download
complete." It should not fetch or download the full media merely to show
the preview.

Use yt-dlp's structured metadata output (for example JSON output in an
information-only mode) and parse it defensively. Handle missing fields
and incomplete extractor results. The channel logo may not be available;
show a neutral fallback avatar instead.

### 4.3 Output modes

Make the choices clear and explain them in the UI:

1.  **Video + Audio** --- download video with sound. If the best video
    and audio are separate streams, use FFmpeg to merge them when
    required.
2.  **Audio Only** --- download audio without a video stream. Offer
    supported audio conversions (such as MP3, M4A, Opus, or WAV) only
    when the source and installed FFmpeg support the requested
    conversion.
3.  **Video Only (No Audio)** --- select a video-only stream and do not
    merge audio. The final file must intentionally have no audio stream.
4.  **Best Available** --- choose a sensible best result compatible with
    the user's selected mode and source formats.

Do not label a combined video as "video only." If the source does not
provide a compatible video-only format, explain that this option is
unavailable for the selected URL/quality.

### 4.4 Resolution and format selection

-   Build the options from formats returned by the extractor; never
    hardcode fake choices.
-   Offer resolutions such as 360p, 480p, 720p, 1080p, 1440p, or 2160p
    only when available.
-   Show extension/container, resolution, FPS where available, codecs
    where useful, approximate file size when known, and whether audio is
    included.
-   Filter formats according to the selected output mode.
-   Clearly mark the recommended/default choice.
-   Explain when FFmpeg is required to merge separate audio/video
    streams or convert audio.
-   If the selected resolution is unavailable, disable it or explain
    why.
-   Do not promise exact file size or completion time if it is unknown.

### 4.5 Filename and destination

-   After inspection and format selection, open a native Windows **Save
    File** dialog before starting the download.
-   Suggest a safe filename based on the media title and selected output
    extension.
-   Let the user edit the filename.
-   Use the chosen file path as the output destination.
-   Use a sensible extension based on the actual selected
    output/container; do not blindly force `.mp4` if the selected output
    is another format.
-   Sanitize Windows-invalid filename characters and reserved names.
-   Prevent path traversal and writing outside the user-selected
    destination.
-   If the chosen file already exists, let the user choose overwrite,
    rename, or cancel.
-   If the dialog is cancelled, do not start the download.
-   After success, show **Open File** and **Open Folder** actions.
-   Do not automatically open the file or run downloaded executables.

### 4.6 Download progress

During download, show: - Media title and thumbnail when available. -
Current stage: preparing, downloading, merging/converting, completed,
failed, or cancelled. - Progress percentage when reliable. - Downloaded
bytes and total bytes when available. - Speed and ETA when available and
meaningful. - Output filename/path. - Cancel action. - Pause/resume only
if implemented correctly for the relevant downloader/source; do not show
fake controls.

Use yt-dlp's machine-readable progress output rather than parsing
colored terminal text. Handle unknown size/ETA gracefully. Throttle
progress events to avoid excessive UI re-renders.

### 4.7 Errors and toasts

Use clear toast notifications for brief feedback and a visible inline
error panel for actionable problems.

Required cases include: - Empty URL. - Invalid URL. - Unsupported
URL/platform. - Could not identify the platform. - URL is inaccessible
or media is unavailable. - Authentication/cookies required but not
configured. - No compatible formats found. - Requested resolution is
unavailable. - Video-only stream is unavailable. - FFmpeg missing. -
Merge/conversion failed. - Destination folder is not writable. - File
already exists. - Disk space or filesystem error. - Network failure or
interrupted download. - Download cancelled. - Download failed with a
retry option where appropriate.

Example messages: - "Please enter a valid URL." - "This link is not
supported or could not be accessed." - "We couldn't identify a supported
platform for this link." - "No compatible video formats were found." -
"Video-only output is not available for this selection." - "FFmpeg is
required to merge these streams, but it wasn't found." - "Choose a
location to save your file." - "Download complete." - "Download failed.
Check the details and try again."

Do not claim a platform is unsupported solely because of one transient
network error. Distinguish unsupported extractor, unavailable content,
authentication, network failure, and missing FFmpeg where possible.
FFmpeg is a post-processing tool; it does not determine whether every
website URL is supported.

### 4.8 Minimal preferences

-   Light theme.
-   Dark theme.
-   Optional "System" theme.
-   Remember the theme choice only if desired via a tiny local
    preference file or Electron preference storage; no database is
    needed.
-   No history, no download database, no metadata library, no accounts,
    no complex settings.
-   Other per-download choices remain in memory and disappear when the
    app closes.

------------------------------------------------------------------------

## 5. Target project structure

Create files gradually as each milestone requires them. Do not create
empty placeholders for the entire application on day one.

``` text
Social Downloader Manager (SDM)/
├─ AGENTS.md
├─ PLAN.md
├─ README.md
├─ CHANGELOG.md
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ resources/
│  ├─ icons/
│  ├─ binaries/
│  │  └─ win32-x64/
│  │     ├─ yt-dlp.exe
│  │     ├─ ffmpeg.exe
│  │     └─ ffprobe.exe
│  └─ THIRD_PARTY_NOTICES.md
├─ src/
│  ├─ main/
│  │  ├─ index.ts
│  │  ├─ windows/
│  │  │  └─ create-main-window.ts
│  │  ├─ ipc/
│  │  │  ├─ register-handlers.ts
│  │  │  ├─ channels.ts
│  │  │  └─ validators.ts
│  │  ├─ services/
│  │  │  ├─ media/
│  │  │  │  ├─ ytdlp-service.ts
│  │  │  │  ├─ media-inspector.ts
│  │  │  │  ├─ format-selection.ts
│  │  │  │  ├─ ffmpeg-service.ts
│  │  │  │  └─ media-types.ts
│  │  │  ├─ downloads/
│  │  │  │  ├─ download-runner.ts
│  │  │  │  ├─ progress-parser.ts
│  │  │  │  └─ error-classifier.ts
│  │  │  └─ filesystem/
│  │  │     ├─ safe-filename.ts
│  │  │     └─ save-dialog.ts
│  │  └─ types/
│  │     └─ ipc.ts
│  ├─ preload/
│  │  └─ index.ts
│  ├─ shared/
│  │  ├─ contracts.ts
│  │  ├─ schemas.ts
│  │  └─ constants.ts
│  └─ renderer/
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ components/
│        │  ├─ layout/
│        │  ├─ url-input/
│        │  ├─ media-preview/
│        │  ├─ format-picker/
│        │  ├─ download-progress/
│        │  └─ ui/
│        ├─ features/
│        │  ├─ inspect-url/
│        │  ├─ select-output/
│        │  └─ download/
│        ├─ hooks/
│        ├─ lib/
│        ├─ stores/
│        ├─ styles/
│        └─ types/
├─ tests/
│  ├─ unit/
│  ├─ component/
│  ├─ integration/
│  └─ e2e/
└─ docs/
   ├─ ARCHITECTURE.md
   ├─ SECURITY.md
   ├─ TESTING.md
   └─ RELEASE.md
```

This is a target structure, not a command to create all files
immediately. Adjust it if the selected starter uses a different safe
layout and update this plan accordingly.

------------------------------------------------------------------------

# 6. Step-by-step roadmap

## Phase 0 --- Scope and dependency checks

### Step 0.1 --- Lock product scope

-   [x] Windows 10/11 x64 first.
-   [x] Media-first downloader using yt-dlp.
-   [x] Prefetch/inspect URL before downloading.
-   [x] Show detected platform, media title, thumbnail, channel/uploader
    and available formats when supplied.
-   [x] Video+audio, audio-only, and video-only modes.
-   [x] Save dialog and editable suggested filename.
-   [x] Progress, cancellation, clear errors and completion actions.
-   [x] Light/dark/system theme only.
-   [x] No database, history, accounts, or persistent metadata.
-   [x] Direct-file downloads (EXE/ISO/ZIP/PDF) are not part of the
    first MVP.

**Acceptance criteria:** This scope is recorded in
`docs/ARCHITECTURE.md` or `docs/DECISIONS.md`. [x] Recorded in
`docs/ARCHITECTURE.md`.

### Step 0.2 --- Dependency and license review

-   [x] Review current yt-dlp documentation and supported extractor
    behavior.
-   [x] Choose trusted sources for yt-dlp and FFmpeg Windows builds.
-   [x] Review current licenses and redistribution requirements.
-   [x] Record available provenance and notices. Project owner confirms
    the supplied yt-dlp.exe came from the official GitHub project; exact
    release/checksum comparison remains a packaging prerequisite. FFmpeg
    version/checksum will be recorded before bundling.
-   [x] Decide how bundled binaries will be updated.
-   [x] Do not bundle unverified executables.

**Acceptance criteria:** `resources/THIRD_PARTY_NOTICES.md` is started
and binary provenance is documented. Completed on project owner
confirmation for the supplied yt-dlp binary; exact release pinning and
checksum comparison remain a packaging prerequisite.

------------------------------------------------------------------------

## Phase 1 --- Project setup

### Step 1.1 --- Create the repository

-   [x] Create a Git repository named `Social Downloader Manager (SDM)`.
-   [x] Add the roadmap (`Plane.md`), `AGENTS.md`, `README.md`,
    `CHANGELOG.md`, and `.gitignore`.
-   [ ] Choose a project license deliberately before public release.

### Step 1.2 --- Initialize Electron + React

-   [x] Use a maintained Electron/Vite/React/TypeScript starter
    (`@quick-start/electron` React + TypeScript template).
-   [x] Install Tailwind CSS using current compatible instructions (Tailwind Vite plugin).
-   [x] Enable TypeScript strict mode.
-   [x] Configure lint, format, typecheck, test, and build scripts.
-   [ ] Commit the lockfile and pin dependency versions.
-   [x] Confirm the app opens on Windows (confirmed by project owner).

**Acceptance criteria:** Empty app launches; lint, typecheck, and build
pass. Windows launch confirmed by project owner; lint, typecheck, and
build passed after Tailwind setup. Lockfile is present; dependency
version pinning and committing the lockfile remain pending.

### Step 1.3 --- Configure Electron securely

-   [x] Add main and preload entry points.
-   [x] Enable context isolation.
-   [x] Disable Node integration in the renderer.
-   [x] Add a restrictive Content Security Policy.
-   [x] Expose only typed, narrow preload methods.
-   [x] Restrict external links and new windows.
-   [x] Document allowed IPC channels.

**Acceptance criteria:** React UI runs without direct Node access and
can call one test IPC method safely. Static typecheck/build passed and
the project owner confirmed the app launches after these changes.

------------------------------------------------------------------------

## Phase 2 --- UI shell and theme

### Step 2.1 --- Design tokens and themes

-   [x] Define typography, spacing, radii, borders, surfaces, and status
    colors.
-   [x] Add light theme.
-   [x] Add dark theme.
-   [x] Add optional system theme tokens.
-   [x] Add a simple theme toggle in the main UI.
-   [ ] Persist only the theme preference if necessary; no database.
-   [ ] Verify contrast, focus states, and keyboard accessibility.

### Step 2.2 --- Main screen

-   [ ] Create a clear URL input area.
-   [ ] Add Paste and Inspect buttons.
-   [ ] Add a loading state for URL inspection.
-   [ ] Add a media preview card placeholder.
-   [ ] Add output mode and format-selection areas.
-   [ ] Add a download progress area.
-   [ ] Add clear empty, success, and error states.
-   [ ] Keep the UI uncluttered and avoid unnecessary pages.

**Acceptance criteria:** The shell works in light/dark/system themes and
has no fake production download logic.

------------------------------------------------------------------------

## Phase 3 --- Shared types and secure IPC

### Step 3.1 --- Define shared contracts

-   [ ] `DetectedPlatform`
-   [ ] `MediaInfo`
-   [ ] `MediaFormat`
-   [ ] `PlaylistInfo` / playlist entry types where applicable
-   [ ] `OutputMode`
-   [ ] `DownloadRequest`
-   [ ] `DownloadProgress`
-   [ ] `DownloadResult`
-   [ ] `AppError`
-   [ ] Runtime schemas for URL and option validation.

### Step 3.2 --- Define narrow preload methods

-   [ ] `media.inspectUrl(url)`
-   [ ] `media.cancelInspection(requestId)`
-   [ ] `downloads.chooseSavePath(suggestedName, extension)`
-   [ ] `downloads.start(request)`
-   [ ] `downloads.cancel(downloadId)`
-   [ ] `downloads.onProgress(callback)`
-   [ ] `downloads.onStatus(callback)`
-   [ ] `files.openFile(path)` and `files.openFolder(path)` with
    main-process validation
-   [ ] `app.getVersion()`

Do not expose unrestricted filesystem access or arbitrary process
execution to the renderer. Add unsubscribe functions for event
listeners.

### Step 3.3 --- Validate IPC

-   [ ] Validate URL and protocol.
-   [ ] Validate format IDs against the formats returned for the
    inspected URL.
-   [ ] Validate output mode and extension.
-   [ ] Validate selected save path and filename.
-   [ ] Reject malformed or oversized input.
-   [ ] Return consistent structured errors.

**Acceptance criteria:** Unit tests reject invalid URLs/options and
verify that only approved IPC actions are available.

------------------------------------------------------------------------

## Phase 4 --- yt-dlp binary and URL inspection

### Step 4.1 --- Binary availability

-   [ ] Add a documented local development path for `yt-dlp.exe`.
-   [ ] Include FFmpeg/ffprobe only from verified sources when required.
-   [ ] Check executable availability and version at startup.
-   [ ] Show a helpful error if a required binary is missing.
-   [ ] Do not download executable files silently at runtime.

### Step 4.2 --- Process wrapper

-   [ ] Implement `ytdlp-service.ts`.
-   [ ] Use `spawn` with an argument array.
-   [ ] Capture stdout/stderr safely with size limits.
-   [ ] Handle exit codes, spawn errors, timeout, and cancellation.
-   [ ] Redact sensitive query parameters from logs.
-   [ ] Avoid duplicate inspection processes for the same request.

### Step 4.3 --- Inspect metadata and formats

-   [ ] Use yt-dlp's structured JSON output in information-only mode.
-   [ ] Parse output defensively.
-   [ ] Normalize title, thumbnail, uploader/channel, duration, webpage
    URL, extractor/site name, playlist data, and formats when available.
-   [ ] Normalize resolution, extension, FPS, audio/video presence,
    codecs, and file size when available.
-   [ ] Handle missing values and incomplete extractor responses.
-   [ ] Support single media URLs and playlists where the extractor
    reports them.
-   [ ] Allow the user to cancel inspection.

**Acceptance criteria:** Supported test URL produces preview data and
formats without downloading the full media. Invalid and unsupported test
URLs show useful errors.

------------------------------------------------------------------------

## Phase 5 --- Platform and content-type identification

### Step 5.1 --- Identify the platform

-   [ ] Use yt-dlp's extractor information as the source of truth.
-   [ ] Show the platform/site name only when returned or reliably
    inferred from the extractor result.
-   [ ] Do not maintain a static list as the only support mechanism;
    extractor support changes over time.
-   [ ] Show a neutral fallback if the site cannot be identified.
-   [ ] Separate "platform identified" from "media extraction
    succeeded."

### Step 5.2 --- Identify media type

-   [ ] Distinguish a single item from a playlist/multi-item URL where
    possible.
-   [ ] Show playlist title and entry count if supplied.
-   [ ] Let the user choose a single entry or the full playlist when
    supported.
-   [ ] Explain when playlist information is unavailable.
-   [ ] Avoid automatically enqueueing a huge playlist without
    confirmation.

### Step 5.3 --- Classify errors

-   [ ] Unsupported extractor/URL.
-   [ ] Invalid URL.
-   [ ] Network failure.
-   [ ] Unavailable/private/region-restricted content.
-   [ ] Authentication required.
-   [ ] No formats returned.
-   [ ] Missing FFmpeg.
-   [ ] Unknown extractor failure.

**Acceptance criteria:** The UI never guesses platform identity from the
URL alone when extraction has not confirmed it. It presents the best
available explanation for failure.

------------------------------------------------------------------------

## Phase 6 --- Preview and format picker

### Step 6.1 --- Build the media preview

-   [ ] Show title.
-   [ ] Show thumbnail or fallback image.
-   [ ] Show platform/site.
-   [ ] Show channel/uploader name.
-   [ ] Show channel avatar/logo only if an appropriate URL is actually
    available.
-   [ ] Show duration and playlist details when available.
-   [ ] Show the maximum reported video resolution when a real video
    format provides it.
-   [ ] Show audio availability and approximate file size when
    available.
-   [ ] Indicate that the data has been fetched and the link was
    recognized.

### Step 6.2 --- Build output mode selection

-   [ ] Video + Audio.
-   [ ] Audio Only.
-   [ ] Video Only (No Audio).
-   [ ] Best Available.
-   [ ] Explain each mode in simple language.

### Step 6.3 --- Build dynamic format options

-   [ ] Populate options from extracted formats.
-   [ ] Display resolution, extension/container, FPS, size when known,
    and audio presence.
-   [ ] Filter out incompatible formats for the selected mode.
-   [ ] Offer only available resolutions.
-   [ ] Mark a recommended option.
-   [ ] Explain when FFmpeg is required.
-   [ ] Handle no compatible format gracefully.

**Acceptance criteria:** Format list reflects the actual URL, not
hardcoded demo data.

------------------------------------------------------------------------

## Phase 7 --- Save dialog and output filename

### Step 7.1 --- Suggest a filename

-   [ ] Build a suggested filename from the media title.
-   [ ] Sanitize Windows-invalid characters and reserved names.
-   [ ] Choose the extension based on the actual selected output format.
-   [ ] Do not force `.mp4` if the user chose another compatible format.
-   [ ] Allow the user to edit the filename.

### Step 7.2 --- Choose the output location

-   [ ] Open Electron's native Save dialog.
-   [ ] Pre-fill the suggested filename and relevant file filter.
-   [ ] If user cancels, do not start the download.
-   [ ] If a file already exists, ask whether to overwrite, choose
    another name, or cancel.
-   [ ] Validate the final destination in the main process.
-   [ ] Do not write outside the selected path.

**Acceptance criteria:** The download begins only after the user
confirms a destination and filename.

------------------------------------------------------------------------

## Phase 8 --- Download modes and post-processing

### Step 8.1 --- Video + Audio

-   [ ] Select a compatible video/audio combination for the requested
    quality.
-   [ ] Merge separate streams with FFmpeg where needed.
-   [ ] Handle missing FFmpeg and merge errors.
-   [ ] Confirm the final output exists before success.

### Step 8.2 --- Audio Only

-   [ ] Select an audio-only stream where available.
-   [ ] Offer only supported conversion choices.
-   [ ] Keep source audio format when conversion is not requested.
-   [ ] Report conversion failures separately from network errors.

### Step 8.3 --- Video Only (No Audio)

-   [ ] Select a true video-only format.
-   [ ] Do not select or merge audio.
-   [ ] Do not mislabel a combined video.
-   [ ] Use ffprobe when available to verify the final file has video
    and no audio stream.
-   [ ] If no compatible video-only format exists, show a clear message
    and do not silently switch modes.

### Step 8.4 --- Best Available

-   [ ] Define sensible format-selection rules.
-   [ ] Respect the chosen output mode.
-   [ ] Prefer a compatible output that does not require unnecessary
    conversion.
-   [ ] Explain when the best source streams need merging.

**Acceptance criteria:** Test files are verified to match the requested
mode.

------------------------------------------------------------------------

## Phase 9 --- Progress, cancellation, and completion

### Step 9.1 --- Progress parsing

-   [ ] Use machine-readable yt-dlp progress output.
-   [ ] Parse percentage, bytes, speed, ETA, and stage where available.
-   [ ] Handle unknown total size/ETA.
-   [ ] Throttle renderer progress events.
-   [ ] Display preparing, downloading, merging/converting, completed,
    failed, and cancelled states.

### Step 9.2 --- Cancel behavior

-   [ ] Implement cancellation for inspection and active download.
-   [ ] Stop child processes safely.
-   [ ] Decide and document how partial files are handled.
-   [ ] Do not show pause/resume unless it is implemented and tested.
-   [ ] Ensure no orphaned yt-dlp/FFmpeg process remains after
    cancellation.

### Step 9.3 --- Completion

-   [ ] Show "Download complete."
-   [ ] Show the final file name.
-   [ ] Add Open File.
-   [ ] Add Open Folder.
-   [ ] Keep the completion state in memory only while the current app
    session needs it.
-   [ ] Do not add the result to a persistent history.

**Acceptance criteria:** Progress stays responsive, cancellation works,
and completion only appears after the output is verified.

------------------------------------------------------------------------

## Phase 10 --- Error UX and toast notifications

### Step 10.1 --- Create error mapping

-   [ ] Map common process/exit errors to safe user-facing messages.
-   [ ] Distinguish unsupported URL from network failure and missing
    FFmpeg where possible.
-   [ ] Avoid showing raw stack traces in normal UI.
-   [ ] Keep detailed diagnostics local and redact secrets.

### Step 10.2 --- Toast and inline errors

-   [ ] Add success, warning, and error toasts.
-   [ ] Add an inline error panel for errors requiring user action.
-   [ ] Add Retry only where retrying is meaningful.
-   [ ] Include "Copy error details" with redacted diagnostics if
    useful.
-   [ ] Ensure toasts are accessible and do not disappear too quickly.

### Step 10.3 --- Test error cases

-   [ ] Empty/invalid URL.
-   [ ] Unsupported URL.
-   [ ] Platform not identified.
-   [ ] Network timeout.
-   [ ] No available formats.
-   [ ] Requested quality unavailable.
-   [ ] Video-only stream unavailable.
-   [ ] FFmpeg missing.
-   [ ] Merge/conversion failed.
-   [ ] Save dialog cancelled.
-   [ ] No write permission or disk space.
-   [ ] Download cancelled or failed.

**Acceptance criteria:** Every common failure gives the user an
understandable next step and never reports false success.

------------------------------------------------------------------------

## Phase 11 --- Testing

### Step 11.1 --- Unit tests

-   [ ] URL validation.
-   [ ] Extractor/platform normalization.
-   [ ] Single-item versus playlist normalization.
-   [ ] Format selection.
-   [ ] Audio-only/video-only/combined rules.
-   [ ] Filename sanitization.
-   [ ] Progress parsing.
-   [ ] Error classification.
-   [ ] IPC validation.

### Step 11.2 --- Integration tests

-   [ ] Binary missing and binary launch failures.
-   [ ] Metadata JSON parsing with missing fields.
-   [ ] yt-dlp successful and failed exits.
-   [ ] FFmpeg merge/conversion success and failure.
-   [ ] Cancellation and partial file cleanup.
-   [ ] Save dialog cancellation prevents download.
-   [ ] Final output verification.

### Step 11.3 --- End-to-end tests

-   [ ] App launches.
-   [ ] User pastes a supported URL.
-   [ ] Preview appears before downloading.
-   [ ] Detected platform and available formats appear.
-   [ ] User chooses output mode and resolution.
-   [ ] Save dialog lets user edit filename and destination.
-   [ ] Download progress updates.
-   [ ] Successful download opens from Open File/Open Folder.
-   [ ] Unsupported URL shows a toast/error panel.
-   [ ] Light/dark/system theme works.
-   [ ] No history/database is created.

Use stable, authorized test media. Website behavior changes, so combine
automated tests with manual smoke tests.

------------------------------------------------------------------------

## Phase 12 --- Security and reliability

-   [ ] Keep Electron context isolation enabled and Node integration
    disabled.
-   [ ] Use a restrictive CSP.
-   [ ] Validate every IPC call.
-   [ ] Spawn child processes with argument arrays.
-   [ ] Do not allow the renderer to choose arbitrary executable paths.
-   [ ] Sanitize filenames and destination paths.
-   [ ] Bound stdout/stderr size.
-   [ ] Redact sensitive URL parameters and secrets.
-   [ ] Do not bypass DRM, paywalls, or access controls.
-   [ ] Do not automatically execute downloaded files.
-   [ ] Test network loss, low disk space, permission failures, and app
    closure.
-   [ ] Clean up temporary files safely.
-   [ ] Verify there are no orphaned child processes.

**Acceptance criteria:** Security checklist reviewed; critical issues
resolved before release.

------------------------------------------------------------------------

## Phase 13 --- Windows packaging and release

### Step 13.1 --- Package the app

-   [ ] Choose Electron Forge or Electron Builder.
-   [ ] Configure app name, version, icon, and Windows target.
-   [ ] Bundle only required, verified binaries.
-   [ ] Verify binary paths in packaged builds.
-   [ ] Rebuild native dependencies if the chosen stack needs them.
-   [ ] Create a Windows installer.

### Step 13.2 --- Clean-machine testing

-   [ ] Install and launch on a clean Windows 10/11 machine or VM.
-   [ ] Confirm users do not need Python, Node.js, or a developer
    environment installed.
-   [ ] Test paths containing spaces and non-English characters.
-   [ ] Test download, cancel, failure, and success flows.
-   [ ] Test uninstall behavior.
-   [ ] Confirm no history database or metadata library is created.
-   [ ] Confirm third-party notices are included.

### Step 13.3 --- Public release

-   [ ] Verify product name and assets.
-   [ ] Publish source/release notes as appropriate.
-   [ ] Publish checksums and third-party notices.
-   [ ] Code-sign the installer if feasible; never claim it is signed if
    it is not.
-   [ ] Document supported behavior and limitations.
-   [ ] Provide a bug-report path and troubleshooting guide.

**Acceptance criteria:** A non-developer can install the app, inspect a
supported media URL, choose a format and save location, download the
media, and open the resulting file.

------------------------------------------------------------------------

## 7. AI coding-agent instructions

Add the following principles to `AGENTS.md`:

1.  Read `PLAN.md` before every task.
2.  Implement one bounded step at a time; never build the whole app in
    one prompt.
3.  Inspect the current code before editing.
4.  State the files expected to change before implementation.
5.  Do not add database, download history, account systems, cloud sync,
    or a complex settings page.
6.  Only theme preference may be persisted; download jobs and metadata
    are session-only.
7.  Do not use mock download behavior in production code.
8.  Never claim tests passed unless they were actually run.
9.  Run lint, typecheck, relevant tests, and build after each milestone.
10. Update checkboxes only when implementation and verification are
    complete.
11. Report changed files, commands run, results, limitations, and the
    next unchecked task.
12. Keep Electron secure and never use shell-interpolated command
    strings.
13. Never bypass DRM or access controls.

### First prompt for the AI agent

> Read `AGENTS.md` and `PLAN.md` fully. We are building Social Downloader Manager (SDM), a
> Windows-first Electron + React + TypeScript + Tailwind media
> downloader powered by yt-dlp and FFmpeg. The app must not use a
> database, download history, accounts, cloud sync, or a persistent
> metadata library. It only needs light/dark/system theme selection.
>
> Start with **Phase 1 only**. Inspect the repository, propose the
> smallest setup plan, initialize a maintained
> Electron/Vite/React/TypeScript project, configure Tailwind, strict
> TypeScript, lint/format/test/build scripts, and make the empty app
> launch on Windows. Follow Electron security requirements. Do not
> implement downloader functionality yet.
>
> Before editing, list the files you expect to create or change. After
> editing, run the available lint, typecheck, test, and build commands.
> Report the exact results and limitations. Update `PLAN.md` only for
> tasks actually implemented and verified. Do not invent test results.

------------------------------------------------------------------------

## 8. Project progress tracker

Mark tasks complete only after they are implemented and verified.

-   [x] Phase 0 --- Scope and dependency checks
-   [ ] Phase 1 --- Project setup
-   [ ] Phase 2 --- UI shell and theme
-   [ ] Phase 3 --- Shared types and secure IPC
-   [ ] Phase 4 --- yt-dlp binary and URL inspection
-   [ ] Phase 5 --- Platform and content-type identification
-   [ ] Phase 6 --- Preview and format picker
-   [ ] Phase 7 --- Save dialog and output filename
-   [ ] Phase 8 --- Download modes and post-processing
-   [ ] Phase 9 --- Progress, cancellation, and completion
-   [ ] Phase 10 --- Error UX and toast notifications
-   [ ] Phase 11 --- Testing
-   [ ] Phase 12 --- Security and reliability
-   [ ] Phase 13 --- Windows packaging and release

**Last completed phase:** Phase 0 --- Scope and dependency checks\
**Current task:** Phase 2 --- UI shell and theme (supplied light/dark palette integrated; visual theme and accessibility review pending)\
**Next action:** Run `npm run dev` and check Light, Dark, and System against the supplied palette, then verify focus visibility and keyboard use. Phase 1 dependency pinning and lockfile commit also remain pending.

------------------------------------------------------------------------

## 9. Definition of done

A task is complete only when: - Implementation is connected to the real
app flow. - Loading, success, cancellation, and error states are handled
where relevant. - Relevant tests pass. - Lint, typecheck, and build
pass. - No fake functionality remains in the production path. -
Documentation and this checklist are updated. - The agent reports what
was actually tested and what remains unverified.

## Final principle

Build a small, trustworthy media downloader---not a large
download-manager suite on day one. First prove the complete path: paste
URL → inspect platform and media → show real available formats → choose
mode and resolution → select filename/location → download with progress
→ show success or a clear error. Add only features that improve this
flow.
