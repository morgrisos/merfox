This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## インストールとアップデート

本アプリケーションは GitHub Releases 経由で配布されます。
[Releases ページ](https://github.com/morgrisos/merfox/releases) から最新のインストーラーをダウンロードしてください。

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

## ログの場所
不具合報告に必要なログファイルは、アプリ内の設定画面「トラブルシューティング」セクションからフォルダを開くことができます。
または以下のパスに保存されています。

- **Mac**: `~/Library/Logs/merfox/main.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\merfox\logs\main.log`

