# Architecture decisions

## Product scope (Phase 0.1)

The first release targets Windows 10/11 x64 and is a media-first desktop downloader built with Electron, React, TypeScript, and yt-dlp. It inspects a URL before download and shows only metadata and formats returned by the extractor. It supports video with audio, audio only, and true video only output, with a native Save dialog, editable filename, download progress, cancellation, useful errors, and open-file/open-folder actions after success.

The app has light, dark, and system themes. It has no database, download history, accounts, cloud sync, persistent metadata library, or complex settings screen. Theme preference is the only state that may be persisted. Direct-file downloads (such as EXE, ISO, ZIP, and PDF) are out of MVP scope. The app will not bypass DRM, paywalls, or access controls, and it will not promise that every site is supported.

## Third-party binary policy

The project owner confirms the locally supplied `yt-dlp.exe` was downloaded from the official GitHub project and used successfully from the command line; accept it for development use. Record its exact upstream release and compare its SHA-256 against release metadata before packaging. For any media binary, record the source URL, license/notices, checksum, and update procedure before bundling. Prefer immutable upstream releases over a mutable `latest` download URL. Do not silently fetch or update executables at runtime.

For yt-dlp, the source is the official [yt-dlp GitHub releases](https://github.com/yt-dlp/yt-dlp/releases). Before packaging, pin the exact release and review its bundled third-party license notices and checksum record for the selected Windows executable.

FFmpeg's official project publishes source and documents its LGPL/GPL build conditions. Its download page points to Windows builds by BtbN and gyan.dev. The current candidate is the BtbN Windows builds published on GitHub; inspect the selected build configuration and notices before use, and only choose a configuration whose licensing obligations the project can meet. Record the exact release and checksum before bundling.
