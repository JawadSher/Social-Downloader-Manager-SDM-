# Third-party notices and binary provenance

This file is a provenance record, not a substitute for the applicable license texts. The project owner has confirmed the supplied yt-dlp executable was downloaded from the official GitHub project and has been used successfully from the command line. The project accepts it for development use based on that confirmation.

## Fontsource fonts

- Packages: `@fontsource/poppins`, `@fontsource-variable/roboto`, and `@fontsource-variable/roboto-mono`
- License: SIL Open Font License 1.1 (OFL-1.1)
- The package license files in `node_modules` and the selected package versions in `package-lock.json` identify the bundled font assets and license terms.

## yt-dlp

- Planned source: [official yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- Planned artifact: Windows x64 `yt-dlp.exe`, pinned to an immutable release
- License review: yt-dlp source is Unlicense; the PyInstaller bundled release executable also contains components under other licenses, including GPLv3+. Include and review the `THIRD_PARTY_LICENSES.txt` supplied with the selected release and comply with its notices.
- Version reported by the project owner after running `yt-dlp.exe --version`: `2025.12.08`. The local file's SHA-256 is recorded below; it has not been compared against a release checksum.
- Update process: select a release deliberately, verify its published checksum (and signature/attestation where available), update this record, and test the new binary. No runtime self-download/update.

### Existing local file (not approved for bundling)

- Path: `resources/binaries/win32-x64/yt-dlp.exe`
- Size: 18,457,028 bytes
- SHA-256 observed locally: `86c3280caa696b567c917ac138bbe0d17e45dc2b329f67562302ee4c3973a06f`
- Version, origin, upstream checksum comparison, and license notices: unknown
- Status: accepted for local development based on project owner confirmation. Record the release/version and verify the release checksum before packaging.

## FFmpeg / ffprobe

- Planned role: merge separate streams, convert audio, and optionally inspect output streams.
- Upstream project: [FFmpeg](https://ffmpeg.org/)
- License review: FFmpeg is LGPL 2.1+ by default; optional components and optimizations can make a build GPL 2+. The license of the actual Windows build depends on its configuration. Review that build's configuration and include the corresponding license texts/notices.
- Planned Windows build source: [BtbN FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds), linked from FFmpeg's download page. Review the selected build configuration and notices before use.
- Local candidate: `resources/binaries/win32-x64/ffmpeg-n9.0-latest-win64-gpl-9.0/bin/ffmpeg.exe` and `ffprobe.exe` (the companion `ffplay.exe` is present too). The directory contains a `LICENSE.txt` with GNU GPL version 3 text. The owner reports this folder is under the project binaries directory.
- Local SHA-256: `ffmpeg.exe` `d28f79bf2aff6e7b8afc72be7f625c7bc27bacc1732bf15ac96bd68235c2d7e9`; `ffprobe.exe` `92701561f5b344cc2be383e57427b62caa22cb24e65552411ab3b499af8fce3b`; `ffplay.exe` `e92dff6ccbba8d214018b302d3145d22f0995d638681d9ac5a4f472643c811d8`.
- Provenance and build configuration are not independently verified from the local files. The name identifies a candidate BtbN FFmpeg 9.0 GPL build, but does not establish the immutable release or checksum match. Do not bundle for distribution until those are matched to upstream release metadata and the exact GPL obligations/source offer are reviewed. `ffplay.exe` is not required by the app and should not be packaged.
- Runtime version/configuration and update process: not verified/selected. Check `ffmpeg.exe -version` and `ffprobe.exe -version`, record exact output, and use an immutable upstream release plus matching checksum before approving packaging.

## Review references

- [yt-dlp installation documentation](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [yt-dlp release artifacts and checksums](https://github.com/yt-dlp/yt-dlp/releases)
- [FFmpeg license and legal considerations](https://ffmpeg.org/legal.html)
- [FFmpeg download page and Windows build links](https://ffmpeg.org/download.html)
