# Social Downloader Manager (SDM)

Windows-first media downloader project using Electron, React, TypeScript, yt-dlp, and FFmpeg.

The product scope, architecture decisions, and third-party binary policy are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The milestone roadmap is [`Plane.md`](Plane.md). Third-party provenance and notices are tracked in [`resources/THIRD_PARTY_NOTICES.md`](resources/THIRD_PARTY_NOTICES.md).

## Project status

Planning and repository setup. The application has not been initialized yet. See `Plane.md` for the current milestone and next step.

## Scope

The MVP inspects media URLs before download and offers media output choices, a native save dialog, progress, cancellation, clear errors, and completion actions. It does not include history, accounts, cloud sync, or a database. Website support depends on yt-dlp and the source site's behavior; not every URL is guaranteed to work.

## Development

Development commands will be documented after the Electron application is initialized.
