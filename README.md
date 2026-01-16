# MerFox - Mercari to Amazon Conversion Tool

MerFox は、メルカリの商品情報を効率的に Amazon 出品用データに変換するデスクトップアプリケーションです。

## インストールとアップデート

本アプリケーションは GitHub Releases 経由で配布されます。
**[最新のインストーラーをダウンロード (GitHub Releases)](https://github.com/morgrisos/merfox/releases)**

**運用ポリシー**:
- **CIステータス**: GitHub Actions (CI) の成功/失敗に関わらず、Releases ページに **Assets (dmg/exe/zip)** が揃っていれば「正式リリース」として使用可能です。
- **手動更新**: 自動更新は無効化されています。新しいバージョンが出た場合は、手動でダウンロード・上書きしてください。

### Mac (macOS)
1. **インストール**: `MerFox-x.x.x-mac-arm64.dmg` をダウンロードし、`MerFox.app` を Applications フォルダにドラッグしてください。
2. **アップデート**: 新しい `.dmg` をダウンロードし、既存のアプリに上書きコピーしてください。
3. **トラブルシューティング**: 
   - 初回起動時に「開発元が未確認」「壊れています」と表示される場合:
   - システム設定 > プライバシーとセキュリティ から「すべて開く」を許可してください。
   - または、ターミナルで `xattr -cr /Applications/MerFox.app` を実行してください。

### Windows
1. **インストール**: `MerFox-x.x.x-win-x64.exe` をダウンロードして実行してください。
2. **アップデート**: 新しい `.exe` を実行すると、自動的に上書き更新されます。
3. **トラブルシューティング**:
   - Windows SmartScreen が表示される場合は「詳細情報」→「実行」を選択してください。

## ログの場所
不具合報告の際は、以下のログファイルを添付してください。
アプリ内の **設定 (Settings) > トラブルシューティング** から「ログフォルダを開く」ボタンで直接アクセスできます。

- **Mac**: `~/Library/Logs/merfox/main.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\merfox\logs\main.log`

## サポート・バグ報告
不具合報告の際は、GitHub Issues にて以下の情報を提供してください：
1. **お使いのOS**: (例: macOS Sequoia 15.1)
2. **アプリバージョン**: (設定画面またはファイル名から確認)
3. **ログファイル**: (上記 `main.log` を添付)
4. **再現手順**: (どのような操作でエラーが出たか)

