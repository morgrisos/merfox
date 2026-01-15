# Build & Maintenance Notes

**This document describes critical configurations that must NOT be changed without deep verification.**

## 1. Zombie Prevention
- **Where**: `src/electron/main.ts` -> `before-quit`
- **What**: The Next.js server spawned as a child process is explicitly killed (`serverProcess.kill()`).
- **Why**: Electron creates zombie processes if the child isn't killed, causing port conflicts (EADDRINUSE: 3000/13337) on next launch.
- **Danger**: Do not remove the `before-quit` handler.

## 2. Windows Fonts (Sidebar Failure)
- **Where**: `src/app/globals.css`, `public/fonts/`, `package.json`
- **What**: Material Symbols are bundled LOCALLY (`public/fonts/*.woff2`) with `@font-face`.
- **Config**: `package.json` -> `files` MUST include `public/**/*`.
- **Why**: Windows packaged builds cannot load Google Fonts efficiently or reliably. If `public` is missing, fonts 404 and icons become text ("dashboard").
- **Danger**: Do not revert to `@import url(...)` for fonts. Do not remove `public/**/*` from `files`.

## 3. Storage Compatibility (UserData)
- **Where**: `src/electron/main.ts`
- **What**: `process.env.MERFOX_RUNS_DIR` is set to `path.join(app.getPath('userData'), 'runs')`.
- **Why**: MacOS App Sandbox and Windows security (Program Files) forbid writing to the app directory. We must write to `Application Support/merfox` or `%APPDATA%/merfox`.
- **Danger**: Do not change storage to `__dirname` or relative paths.

## 4. Distribution Config
- **File**: `package.json`
- **Artifact Name**: `MerFox-${version}-${os}-${arch}.${ext}`
- **Targets**:
  - Mac: `dmg` (Distribution), `zip` (Update/Generic)
  - Win: `nsis` (Installer `.exe`)
- **ASAR**: `false` (Currently disabled to avoid complexity with static file serving, though technically possible to enable if `public` is unpacked). Keep false unless optimizing size drastically.
