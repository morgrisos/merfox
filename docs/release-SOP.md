# MerFox Release Standard Operating Procedure (SOP)

**Version**: 1.0
**Purpose**: 次回以降の配布作業が迷わず回るように「一本道のRelease手順」を固定する。
**最終正**: GitHub Releases (assetsが揃っていること)
**CI Verify**: 観測(soft)扱い

---

## 1. Preconditions
- ローカル環境 (Mac推奨)
- Node/npm がインストール済みであること
- アプリの署名なし(Unsigned)を前提とする

## 2. Version & Tag rule
`package.json` の `version` と Git tag を必ず一致させる。

```bash
# package.json のバージョンを更新 (例: 0.1.88 の場合)
npm version 0.1.88 --no-git-tag-version

# コミットとタグ付け
git add package.json package-lock.json
git commit -m "chore: bump version to 0.1.88"
git tag v0.1.88
git push origin main --tags
```

## 3. Build
ローカルで `dist` をクリーンにしてからビルド・パッケージングを走らせる。

```bash
cd /Users/yuga/VSCode/V4/merfox

# 古い生成物を削除し、依存関係をクリーンインストール
rm -rf dist && mkdir -p dist
npm ci

# ビルド実行 (Next.jsビルド -> tsc -> electron-builder)
npm run build
```

## 4. Release
GitHub Release を作成し、ビルドした assets を添付する。

```bash
# GitHub CLI を使用したリリース作成とアップロード例
gh release create v0.1.88 --title "v0.1.88" --generate-notes ./dist/MerFox-*.dmg ./dist/MerFox-*.zip ./dist/MerFox-*.exe ./dist/latest*.yml
```
※ Web画面から手動作成する場合も同様に、`v0.1.88` タグを指定し `dist/` の成果物をすべてアップロードする。

## 5. Verify
動作確認の実行後、ローカルスクリプトで出力成果物の整合性を検査し、PASSを確認する。

```bash
# verify_packaged.sh に実行権限を付与し、実行 (= PASSであること)
chmod +x scripts/verify_packaged.sh
./scripts/verify_packaged.sh
```

## 6. Final Check
Release assets のファイル名がバージョンと一致しており、以下の必要ファイルが漏れなく揃っていることを最終確認する。

**必要asset:**
- mac: `.dmg` / `.zip`
- win: `.exe` / `.zip`
- メタデータ: `latest.yml` / `latest-mac.yml`

```bash
# 最終 Asset 確認コマンド例
gh release view v0.1.88 --json assets --jq '.assets[].name'
```

## 7. Troubleshooting
- **GitHub TLSエラー時**
  GitHub CLI や API 通信で TLS / SSL エラー、またはタイムアウトが発生する場合は DNS に問題がある可能性が高い。
  Macの「システム設定 > ネットワーク > Wi-Fi > 詳細 > DNS」からパブリックDNSに変更してリトライする。
  - Cloudflare: `1.1.1.1`
  - Google: `8.8.8.8`

## 8. Optional: Local pre-push Hook (推奨)
`scripts/verify_packaged.sh` の実行を `git push` 前に自動化する任意設定。
**注意：`.git/hooks/` の内容はリポジトリに含めない（ローカルのみ）**

```bash
# .git/hooks/pre-push を作成・設定
cat > .git/hooks/pre-push << 'EOF'
#!/usr/bin/env bash
set -e
echo "🔍 Running pre-push verify..."
./scripts/verify_packaged.sh
echo "✅ verify passed. Proceeding with push."
EOF
chmod +x .git/hooks/pre-push
```

- verify が FAIL した場合、`push` は中断されます。
- 削除するには `rm .git/hooks/pre-push`
