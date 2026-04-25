# PA-API セットアップガイド

## 概要

MerFox の ASIN 特定エンジンは `SEARCH_PROVIDER` 環境変数でプロバイダを切り替えられます。

| モード | 値 | 用途 |
|---|---|---|
| モック | `SEARCH_PROVIDER=mock`（デフォルト） | テスト・スコアリング検証 (キー不要) |
| PA-API 実接続 | `SEARCH_PROVIDER=paapi` | 本番・実データ評価 (キー必須) |

---

## 1. PA-API キーの取得

1. [Amazonアソシエイト](https://affiliate.amazon.co.jp/) に登録する
2. [認証情報管理ページ](https://affiliate.amazon.co.jp/assoc_credentials/home) から以下を取得：
   - **アクセスキー (Access Key ID)**
   - **シークレットキー (Secret Access Key)**
   - **パートナータグ (Partner Tag)** — `yourstore-22` 形式

---

## 2. 認証情報の設定

```bash
# テンプレートをコピー
cp .env.local.example .env.local

# エディタで次の3変数を入力
# AMAZON_PAAPI_ACCESS_KEY=AKIAXXXXXXXXXXXXXXXX
# AMAZON_PAAPI_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# AMAZON_PAAPI_PARTNER_TAG=yourstore-22
# SEARCH_PROVIDER=paapi
```

> [!CAUTION]
> `.env.local` は `.gitignore` 対象です。絶対にコミットしないでください。

---

## 3. キー未設定時の動作

キーを設定せずに `SEARCH_PROVIDER=paapi` で起動すると、起動直後に以下のエラーが出て処理が停止します：

```
[PaapiProvider] Missing PA-API Credentials.
Please set AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY,
and AMAZON_PAAPI_PARTNER_TAG in your .env.local file.
```

---

## 4. 実接続評価コマンド

キー設定後、ゲームカテゴリ 50 件で ASIN 特定率を評価します：

```bash
# .env.local に実キーを設定した後に実行
SEARCH_PROVIDER=paapi node scripts/eval_step16.js
```

または `.env.local` を読み込みながら実行する場合：

```bash
# dotenv をインストールしている場合
node -r dotenv/config scripts/eval_step16.js dotenv_config_path=.env.local
```

---

## 5. 成功条件

| 項目 | 基準 |
|---|---|
| **最低ライン** | VERIFIED ≥ 25件 (50%) |
| **目標ライン** | VERIFIED ≥ 30件 (60%) |
| LOW_CONFIDENCE | できるだけ少なく |
| 版違い誤一致 | `series_mismatch` / `edition_mismatch` がある候補を排除できていること |

---

## 6. run.log の見方

実接続成功時、以下のようなログが出ます：

```log
[PROVIDER] type=paapi initialized
[ASIN] GAME_META item_id=m14036262177 platform=Switch edition= series=3
[ASIN] SEARCH item_id=m14036262177 keyword="Switch ドラゴンクエスト3..." source=title+brand
[ASIN] CANDIDATES item_id=m14036262177 count=5
[ASIN] TITLE_FETCHED asin=B0XXXXX title="ドラゴンクエストIII そして伝説へ... - Switch"
[ASIN] VERIFIED item_id=m14036262177 asin=B0XXXXX score=0.82 reason=title:0.82 series:1 brand:skip(platform-brand) ...
```

---

## 7. 現状ステータス（2026-03-11）

| フェーズ | 状態 |
|---|---|
| GOAL19: ゲームメタ抽出 | ✅ 完了 |
| GOAL20: PA-API 受け口実装 | ✅ 完了（実接続待ち） |
| GOAL20: PA-API 実接続評価 | ⏳ 認証情報待ち |
