# Build & Maintenance Notes

## Critical: Version Control Exclusions

> [!CAUTION]
> **NEVER COMMIT `dist/` or `node_modules/`**
> GitHub rejects files > 100MB (`GH001`).
> Artifacts (`.dmg`, `.exe`, `.zip`) often exceed this limit.

### Correct `.gitignore` Setup
Ensure your `.gitignore` contains:
```
/dist
/dist-electron
/out
/build
/node_modules
*.dmg
*.zip
*.exe
```

## Packaging
- **Mac**: `npm run build-desktop -- --mac` -> `dist/MerFox-x.x.x-mac-arm64.dmg`
- **Win**: `npm run build-desktop -- --win` -> `dist/MerFox-x.x.x-win-x64.exe`
- **Artifacts**: These are uploaded to GitHub Releases by CI. **DO NOT PUSH TO REPO.**

## Auto-Update Config
- **Repository**: set in `package.json` (morgrisos/merfox).
- **Token**: CI uses `secrets.GITHUB_TOKEN`.
- **Flow**:
  1. Commit changes.
  2. Tag `v0.1.x`.
  3. Push Tag.
  4. Actions builds & uploads assets.
  5. App launches -> Checks Release -> Updates.

## Zombie Processes
`serverProcess.kill()` in `main.ts` is critical to prevent orphaned Next.js servers.
