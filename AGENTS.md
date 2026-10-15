# Project instructions for coding agents

- Read `Plane.md` fully before each task; it is the project roadmap.
- Implement one bounded roadmap step at a time. Inspect existing files before editing and name expected changes first.
- Follow the scope in `docs/ARCHITECTURE.md`: Windows-first media downloader; no accounts, database, download history, cloud sync, or persistent metadata library. Only the theme preference may be persisted.
- Do not add mock download behavior to production paths or claim a check passed unless it was actually run.
- Update roadmap checkboxes only when their stated work is complete. Report changed files, commands and results, limitations, and the next unchecked task.
- Keep Electron secure: context isolation on, renderer Node integration off, narrow validated IPC, restrictive CSP, and argument-array process spawning. Never interpolate user input into shell commands.
- Do not bypass DRM, paywalls, or access controls, and never automatically run downloaded files.
- Before bundling third-party executables, record their pinned version, source, checksum, license notices, and update procedure in `resources/THIRD_PARTY_NOTICES.md`.
