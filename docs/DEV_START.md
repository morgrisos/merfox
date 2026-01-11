# MerFox 開発スタートガイド

MerFox（メルフォックス）の開発・起動手順です。

## 1. 準備 (初回のみ)
モジュールをインストールします。

```bash
npm install
```

## 2. 起動
サーバーと画面を一括で起動します。

```bash
npm run dev:all
```

起動したら、以下のURLをブラウザで開いてください。
- **Web画面**: http://localhost:5173
- **APIサーバー**: http://localhost:3001
- **成果物の保存先**: `server/runs/` (デフォルト)

## 3. runs保存先の変更 (オプション)
保存先を変更したい場合、環境変数 `MERFOX_RUNS_DIR` を指定して起動します。

```bash
export MERFOX_RUNS_DIR="/path/to/my/runs"
npm run dev:all
```
