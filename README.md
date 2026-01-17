# MerFox - Mercari to Amazon Conversion Tool

MerFox は、メルカリの商品情報を効率的に Amazon 出品用データに変換するデスクトップアプリケーションです。

## インストール (Install)
GitHub Releases から最新のインストーラーをダウンロードしてください。
**[最新版ダウンロード (GitHub Releases)](https://github.com/morgrisos/merfox/releases)**

### Mac (macOS)
1. `MerFox-x.x.x-mac-arm64.dmg` をダウンロード。
2. 開いて `MerFox.app` を Applications フォルダにドラッグ。
3. 初回のみ、起動時に「開発元未確認」等の警告が出る場合があります。
   - 解決法: `システム設定 > プライバシーとセキュリティ` で「このまま開く」を許可してください。

### Windows
1. `MerFox-x.x.x-win-x64.exe` をダウンロード。
2. 実行してインストール（自動で起動します）。
3. SmartScreen警告が出る場合は「詳細情報 -> 実行」を選択してください。

## アップデート (Update)
現在、手動アップデート方式を採用しています。
1. アプリ内の **設定 (Settings)** 画面を開く。
2. 「最新版を開く」ボタンをクリック（ブラウザが開きます）。
   - ※ ダウンロードが失敗する場合は、その下の「ミラーからダウンロード」を使用してください。
3. 最新のインストーラー (`.dmg` / `.exe`) をダウンロードし、上書きインストールしてください。
   - データや設定は保持されます。

## ログとトラブルシューティング (Logs & FAQ)

### ログの取得方法
不具合報告の際は、ログファイルの添付をお願いします。
- **場所**: 設定 (Settings) > トラブルシューティング > 「Logs」ボタンでフォルダが開きます。
- **ファイル名**: `main.log`

### FAQ (よくある質問)

<a id="download-mirrors"></a>
## Download Mirrors (予備のダウンロード先)
自宅Wi-Fi等で GitHub Releases (release-assets) への接続がTLS認証エラーで失敗する場合は、以下のミラーリンクを使用してください。

- **[ダウンロード (Google Drive)](https://drive.google.com/drive/folders/1uRY49dqN6NPydRJ1BvO0M2mtkY8_gBga?usp=sharing)**

**収録ファイル (推奨運用):**
- Mac: `MerFox-latest-mac.dmg` (または `MerFox-0.1.44-mac-arm64.dmg`)
- Windows: `MerFox-latest-win.exe`

※ 管理者が手動で更新しているため、最新版の反映に時間がかかる場合があります。

---

**Q. 起動しません / "壊れています" と出ます (Mac)**
Appleのセキュリティ仕様によるものです。ターミナルで以下を実行すると解決する場合があります：
`xattr -cr /Applications/MerFox.app`

**Q. Windowsでウイルス対策ソフトに反応する**
署名未登録のため反応することがあります。安全なアプリですが、気になる場合は使用を控えてください。

**Q. ダウンロードが "SSLエラー" や "ネットワークエラー" で失敗する**
ご利用のネットワークでGitHubへのアクセスが制限されている可能性があります。
設定画面の「ミラーからダウンロード」ボタンを使用するか、別のネットワーク（テザリング等）をお試しください。

**Q. ログが溜まって重くなりませんか？**
自動的にローテーションされ、肥大化しないよう設計されています（上限5MB）。
設定画面の「Clear」ボタンで手動削除も可能です。

