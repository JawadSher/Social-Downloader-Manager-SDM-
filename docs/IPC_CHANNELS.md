# IPC channels

Only channels listed here may be exposed to renderer code. The preload exposes
typed methods; it does not expose `ipcRenderer` or other raw Electron APIs.

| Channel | Direction | Input | Output | Validation |
| --- | --- | --- | --- | --- |
| `app:get-version` | Renderer → main | None | App version string | No renderer input; handled by Electron's `app.getVersion()` |

Add a channel here when its implementation and main-process validation are
ready. Validate all renderer-controlled values in the main process.
