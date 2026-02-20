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

## Support

- サブスクリプションの更新・延長は運用者へ連絡してください（[License Server Runbook](docs/license-server-OPS.md) 参照）
- ライセンス停止中の解除は運用者へ連絡してください

## Phase 4 (ExportService / AsinService) 封印ノート

> **現状**: Phase 4 は `Scraper.js` 内でコメントアウトのため**完全無効**。
> 有効化する前に `converter/index.ts` の固定値（`item-condition: 11` / `leadtime: 2` 等）と
> `ExportService.js` の固定値（`UsedLikeNew` / `handling_time: 3` 等）の整合設計が必要。
> **有効化は別ステップ（別PR）で行う。このPR（fix/safety-sold-condition-desc-v189）では行わない。**
