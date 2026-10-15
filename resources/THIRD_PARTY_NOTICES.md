# Third-party notices and binary provenance

This file is a provenance record, not a substitute for the applicable license texts. The project owner has confirmed the supplied yt-dlp executable was downloaded from the official GitHub project and has been used successfully from the command line. The project accepts it for development use based on that confirmation.

## yt-dlp

- Planned source: [official yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- Planned artifact: Windows x64 `yt-dlp.exe`, pinned to an immutable release
- License review: yt-dlp source is Unlicense; the PyInstaller bundled release executable also contains components under other licenses, including GPLv3+. Include and review the `THIRD_PARTY_LICENSES.txt` supplied with the selected release and comply with its notices.
- Version: not independently recorded. The local file's SHA-256 is recorded below; it has not been compared against a release checksum.
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
- Version, checksum, and update process: not selected. Choose and record them before bundling an FFmpeg build.

## Review references

- [yt-dlp installation documentation](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [yt-dlp release artifacts and checksums](https://github.com/yt-dlp/yt-dlp/releases)
- [FFmpeg license and legal considerations](https://ffmpeg.org/legal.html)
- [FFmpeg download page and Windows build links](https://ffmpeg.org/download.html)
