# Social Downloader Manager (SDM)

A Windows-first media downloader built with **Electron, React, TypeScript, yt-dlp, and FFmpeg**. Inspect supported media URLs, choose your preferred output format and quality, and download media through a clean, native desktop experience.

> **Project status:** Early development. The application scaffold is in place, but dependencies and the complete download workflow have not yet been verified.

## Overview

Social Downloader Manager aims to make downloading supported online media simple and straightforward. Paste a URL, inspect the available media, choose how you want to download it, and save the result directly to your computer.

The application uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) for media extraction and downloading, with [FFmpeg](https://ffmpeg.org/) for supported media merging and post-processing tasks.

## Planned Features

- **URL inspection** — Identify supported websites and retrieve available media information before downloading.
- **Media preview** — Display the title, thumbnail, uploader, platform, and other available metadata.
- **Flexible output options** — Choose video with audio, audio only, or video only when supported by the source.
- **Quality and format selection** — Select from the formats and resolutions available for the provided URL.
- **Native save dialog** — Choose the destination and customize the output filename before downloading.
- **Download progress** — Show progress, download speed, transferred data, and estimated time remaining when available.
- **Cancellation** — Cancel an active download.
- **Clear error feedback** — Explain unsupported URLs, extraction failures, missing dependencies, and network problems.
- **Minimal interface** — A clean Windows-focused UI with light and dark themes.

Features are planned and may change as development progresses.

## Technology Stack

| Technology | Purpose |
|---|---|
| Electron | Windows desktop application |
| React | User interface |
| TypeScript | Type-safe application code |
| Vite | Development server and frontend build |
| Tailwind CSS | UI styling |
| yt-dlp | Media extraction and downloading |
| FFmpeg / ffprobe | Media processing and inspection |
| Node.js | Desktop-side operations and process management |

## Project Scope

The initial release focuses on downloading supported online media.

**Included in the MVP**
- URL inspection and media information
- Format and quality selection
- Native file-save dialog
- Download progress and cancellation
- Error handling and completion feedback
- Light and dark themes

**Intentionally excluded from the MVP**
- Download history
- Database or persistent media library
- User accounts or cloud synchronization
- Complex settings pages
- General-purpose downloads of arbitrary files such as EXE, ISO, ZIP, and PDF

Website compatibility depends on yt-dlp's extractors, source-site changes, network conditions, and the availability of the requested media. Not every URL or format is guaranteed to work.

## Getting Started

### Prerequisites

Install the following before starting development:

- [Node.js](https://nodejs.org/) — use a version supported by the project dependencies.
- npm — included with Node.js.
- [Git](https://git-scm.com/) — for version control.

The application will also need compatible yt-dlp and FFmpeg binaries for its media workflow. Their setup and distribution policy are documented in the project architecture.

### Installation

Clone the repository and enter the project directory:

```powershell
git clone <repository-url>
cd <repository-directory>
```

Install the dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

**Note:** The scaffold's development workflow and required dependencies have not yet been verified. The commands above should be confirmed against the current project configuration.

## Available Commands

The current scaffold defines the following checks:

```powershell
npm run lint
npm run typecheck
npm run build
```

These commands should be run after dependencies are installed. A test script and Tailwind CSS setup are still part of the project setup work.

## Documentation

- [Architecture and Technical Decisions](docs/ARCHITECTURE.md) — Product scope, architecture, and third-party binary policy.
- [Development Roadmap](Plane.md) — Milestones, implementation steps, and progress tracking.
- [Third-Party Notices](resources/THIRD_PARTY_NOTICES.md) — Third-party software provenance, licenses, and notices.

## Security and Responsible Use

The application is intended for legitimate media downloading. It will not intentionally bypass DRM, authentication, paywalls, or other access controls.

To protect users, desktop-side operations should be handled through a restricted Electron preload API and validated IPC messages. External tools should be launched using safe process arguments rather than interpolated shell commands.

Users are responsible for complying with applicable laws, copyright requirements, and the terms of the websites they access.

## Contributing

The project is under active development. Contributions, bug reports, and suggestions are welcome.

Before submitting changes:

1. Review the architecture document and current roadmap.
2. Keep changes focused on the current milestone.
3. Run the available lint, type-check, and build commands.
4. Update the roadmap only after the relevant work has been implemented and verified.

## License

The project's license has not yet been specified. Check the repository for a `LICENSE` file before using, modifying, or redistributing the project.

Third-party components, including yt-dlp and FFmpeg, have their own licensing and redistribution requirements. See [Third-Party Notices](resources/THIRD_PARTY_NOTICES.md) for the project's records.

---

**Social Downloader Manager (SDM)** — a simple, Windows-focused approach to downloading supported online media.