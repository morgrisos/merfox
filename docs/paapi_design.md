# PA-API (Product Advertising API) 疎通テスト設計メモ

本ドキュメントは、Amazon PA-API 本接続へ移行する際のテスト設計および留意点を明文化するものです。

## 1. 入力想定 (MerFox -> Provider)

非Book/Book を問わず、以下の情報を `ISearchProvider` の各メソッドへ投下します。

### a) JAN/UPC検索 (`searchByJan(jan)`)
- **想定入力**: `4988601010436` 等の13桁数字
- **PA-API側操作**: `ItemLookup` または `SearchItems` にて `Keywords=JAN`, `SearchIndex=All` を指定。

### b) ISBN検索 (`searchByIsbn(isbn)`)
- **想定入力**: `9784757562865` 等の13桁(または10桁)数字
- **PA-API側操作**: `ItemLookup` または `SearchItems` にて `Keywords=ISBN`, `SearchIndex=Books` を指定。

### c) タイトル・キーワード検索 (`searchByKeyword(keyword, maxResults)`)
- **想定入力**: `"ドラゴンクエストXI Nintendo Switch SQUARE ENIX"` 等の精製済みキーワード
- **PA-API側操作**: `SearchItems` にて `Keywords=入力文字列`, `SearchIndex=All` を指定。

### d) ASIN詳細補完 (`lookupByAsin(asin)`)
- **想定入力**: `B07SDG299Q` 等のASIN文字列
- **PA-API側操作**: `GetItems` (ASIN配列指定) にて `Resources=ItemInfo.Title,ItemInfo.ByLineInfo,ItemInfo.Classifications,ItemInfo.Features` 等を追加取得。

---

## 2. 抽出対象レスポンス (Provider -> MerFox)

PA-API から取得した JSON 構造を、`ISearchProvider._formatResponse` フォーマットに詰めます。

- **`asin`**: `Item.ASIN`
- **`title`**: `Item.ItemInfo.Title.DisplayValue`
- **`brand`**: `Item.ItemInfo.ByLineInfo.Brand.DisplayValue` または `Manufacturer.DisplayValue`
- **`category`**: `Item.ItemInfo.Classifications.Binding.DisplayValue` または `ProductGroup.DisplayValue`
- **`platform`**: `Item.ItemInfo.Features` などから抽出（該当プラットフォーム）
- **`url`**: `Item.DetailPageURL`
- **`source`**: `"paapi"`
- **`raw`**: PA-API が返した実 JSON（原因追及用として保持）

---

## 3. `scoreCandidate` による VERIFIED 判定への影響

APIからの返り値を上記2のフォーマットに詰めて返せば、**MerFox 側の `AsinService.scoreCandidate()` の既存ロジックには一切手を入れることなく**、以下の基準で判定が行われます。

- **スコア要素**: 
  - `titleSimilarity()` (最大 0.5): 取得タイトルとメルカリ抽出タイトルの類似度
  - `brand` 一致 (0.2)
  - `category` 一致 (0.2)
  - `platform` 一致 (0.1)

これらが合算され、以下の動作となります。
- **Score >= 0.70**: `VERIFIED` として確定 (JAN/ISBN直引きなど、一意の場合はこれを超えるように構成可能)
- **Score >= 0.50**: `LOW_CONFIDENCE` (候補として表示するが目視確認扱い)
- **Score < 0.50**: `NO_MATCH`

---

## 4. 疎通時のテストシナリオ

実キーを取得できた場合、以下の手順で疎通検証を行ってください。

1. **実キー設定**: `.env` や `process.env` に `AMAZON_PAAPI_ACCESS_KEY` 等をセット。
2. **PROVIDER切替**: プロセス起動時に `SEARCH_PROVIDER=paapi` を指定。
3. **単発テスト実行**: 
   `AsinService` 単体テストスクリプトまたは手動での `Provider.searchByKeyword("ドラゴンクエストXI")` の実行を行い、PA-API の生ログ (`raw`) が `{ asin, title, brand... }` 形式にマッピングされる出力を確認。
4. **回帰確認**: 本番データ数件（モックテスト使用のDQXIなど）を通し、`VERIFIED` または `LOW_CONFIDENCE` へ到達することを確認。
5. **完了宣言**: PA-API 本接続の運用開始を宣言。
