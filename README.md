# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Official Documentation & Verification (Fixed)

- **License Server Runbook**: [docs/license-server-OPS.md](docs/license-server-OPS.md)
  - Canonical guide for manual operation, monitoring, and recovery.
- **Release Verification Gate**: [scripts/verify_packaged.sh](scripts/verify_packaged.sh)
  - Automated check for release artifacts.
  - Note: Directories `amazon/profit/asin/failed` are treated as WARNINGs if missing in 0-row runs.
