cat > skills/merfox_tsv_gate/SKILL.md <<'MD'
---
name: merfox_tsv_gate
description: Gate to verify packaged app health + TSV generation (Wizard -> Mapping -> Convert) with objective evidence
---

# MerFox TSV Gate (P0)
目的：P0「Amazon TSVが実用レベルで確実に出る」を、推測ではなく “証拠ファイル” で合否判定する。

## 最重要ルール（事故防止）
- .next / _next / standalone / Resources / node_modules / minified JS への grep/strings/cat 禁止（I/O詰まり事故）
- status系APIで run.log の全文読み・grep・文字列探索は禁止（同期I/O・高頻度readによるAPIフリーズ事故防止）
- 出力は「ファイル実体・サイズ・先頭/末尾」中心。感想・推測で完了宣言しない
- 成果物互換：Run配下の成果物セットを壊さない（raw.csv/run.log/amazon/* 等）
- TSV方針：amazon_upload.tsv は **有効行があるときだけ生成**（0件なら作らない）
- BOM方針：成果物CSV/TSVのBOMルールは仕様に従う（Amazon TSVにBOMを強制しない）

【固定ルール（今回の確定）】
- status.ts は run.log を読まない（フリーズ/競合の再発防止）
- 進捗は raw.csv の存在＋行数由来の counts を正にする（status APIの正本はここ）
- Scraper は raw.csv を開始直後に作成し、取得ごとに追記（0/0 固まり対策）
- AmazonConverter は Run固有 mapping.csv を最優先（global参照でTSV空の事故防止）
- inventory_watch.csv は BOMありOK / amazon_upload.tsv は BOMなし推奨＆0件なら作らない

## 使い方（毎回この順）
Step0（必須）：起動してる.appのズレ→Releaseの順で検出
1) bash skills/merfox_tsv_gate/scripts/app_version_check.sh
2) bash skills/merfox_tsv_gate/scripts/release_check.sh

Step1：repoが重くなってないか
3) bash skills/merfox_tsv_gate/scripts/repo_health.sh

Step2：packaged が生きてるか（API/port）
4) bash skills/merfox_tsv_gate/scripts/packaged_smoke.sh

Step3：UIで1回だけ実行（Wizard）
5) Wizard Step1→Step4→Step6 を1回だけ回す（少数でOK）
   - Step4: mapping.csv に最低1件のASINを保存
   - Step6: TSV生成を実行

Step4：TSV証拠回収（合否判定）
6) bash skills/merfox_tsv_gate/scripts/tsv_proof.sh

## 合格条件（P0）
- packaged_smoke が「PORT LISTEN」「/api/health が 200」を示す
- 最新Runディレクトリに raw.csv が存在し、ヘッダのみではない（2行目以降がある）
- run.log に Convert/Map/Export の診断行が残る（数字が出る、"-"は禁止）
- amazon_upload.tsv が存在し、標準ヘッダ + 1行以上（※0件なら “作られない” のが正）
- 失敗時は tsv_proof.sh が「どこで0になったか」を明示する

## 失敗時の切り分け（最短）
- PORTがLISTENしない：packaged_smokeのログ/bootLog/nextErr を提出
- /api/health が 404：health route 未同梱 or 別app起動の疑い（distの.app明示起動）
- raw.csv がヘッダのみ：抽出0件（URL/フィルタ/ブロック/ライセンス/Automation経路を疑う）
- TSVが id\tprice だけ：旧ExportService/スタブ経路が生きている（生成元を遮断）

MD