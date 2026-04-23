# MerFox License Server

月額サブスク（5,000円/月）専用のライセンス認証サーバー。
1台の端末に固定、オフライン猶予72時間、Stripe連携。

## 特徴

- ✅ 月額サブスクリプション管理（Stripe連携）
- ✅ 1ライセンス = 1端末固定
- ✅ オフライン猶予72時間（Lease Token）
- ✅ 自動ライセンス発行（Stripe Webhook）
- ✅ 管理者による手動発行（Admin API）
- ✅ Docker対応（PostgreSQL同梱）

---

## 起動手順

### 1. 環境変数設定

```bash
cd license-server
cp .env.example .env
```

`.env`を編集して以下を設定：

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/merfox_licenses?schema=public"

# JWT Secret（openssl rand -base64 32で生成）
JWT_SECRET="your-secret-key-here"

# Admin API Key（openssl rand -hex 32で生成）
ADMIN_API_KEY="your-admin-api-key-here"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Server
PORT=3001
NODE_ENV=development
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. データベース起動 + マイグレーション

```bash
# PostgreSQLをDockerで起動
docker compose up -d postgres

# Prismaマイグレーション実行
npx prisma migrate dev --name init

# Prismaクライアント生成
npx prisma generate
```

### 4. サーバー起動（開発モード）

```bash
npm run dev
```

サーバーが `http://localhost:3001` で起動します。

---

## API仕様

### 1. POST /v1/activate

初回アクティベーション。deviceIdを端末に固定します。

**リクエスト：**
```bash
curl -X POST http://localhost:3001/v1/activate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "deviceId": "mac-address-or-unique-id"
  }'
```

**レスポンス（成功）：**
```json
{
  "ok": true,
  "leaseToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-19T17:00:00.000Z"
}
```

**エラー例：**
- `404`: License not found
- `403`: License is not active / No active subscription
- `409`: License already activated on another device

---

### 2. POST /v1/lease

Lease Token更新（オフライン期限が切れる前に実行）。

**リクエスト：**
```bash
curl -X POST http://localhost:3001/v1/lease \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "deviceId": "mac-address-or-unique-id"
  }'
```

**レスポンス：**
```json
{
  "ok": true,
  "leaseToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-19T17:00:00.000Z"
}
```

---

### 3. GET /v1/status

Lease Tokenの検証 + ライセンス状態確認。

**リクエスト：**
```bash
curl -X GET http://localhost:3001/v1/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**レスポンス：**
```json
{
  "ok": true,
  "licenseStatus": "active",
  "subscriptionStatus": "active",
  "deviceId": "mac-address-or-unique-id",
  "lastSeenAt": "2026-02-16T08:00:00.000Z"
}
```

---

### 4. POST /v1/admin/issue

管理者による手動ライセンス発行。

**リクエスト：**
```bash
curl -X POST http://localhost:3001/v1/admin/issue \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-api-key-here" \
  -d '{
    "email": "customer@example.com",
    "note": "Manual issue for testing"
  }'
```

**レスポンス：**
```json
{
  "ok": true,
  "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
  "customerId": "clxxxxxxxxxxxxxx",
  "licenseId": "clxxxxxxxxxxxxxx"
}
```

---

### 5. POST /v1/webhooks/stripe

Stripe Webhook受信エンドポイント。

**対応イベント：**
- `checkout.session.completed`: 初回決済完了 → Customer/Subscription/License作成
- `customer.subscription.updated`: サブスク状態更新 → License状態同期
- `customer.subscription.deleted`: サブスク削除 → License無効化

Stripe CLIでローカルテスト：
```bash
# Stripe CLIインストール
brew install stripe/stripe-cli/stripe

# Webhookリスニング開始
stripe listen --forward-to localhost:3001/v1/webhooks/stripe

# 表示されるwebhook secretを.envのSTRIPE_WEBHOOK_SECRETに設定

# イベント送信テスト
stripe trigger checkout.session.completed
```

---

## Docker本番環境起動

### 1. .envファイル準備

```bash
cp .env.example .env
# 本番用の値を設定（JWT_SECRET, ADMIN_API_KEY, STRIPE_*）
```

### 2. Docker Compose起動

```bash
docker compose up -d
```

これで以下が起動します：
- PostgreSQL（localhost:5432）
- License API Server（localhost:3001）

### 3. ログ確認

```bash
docker compose logs -f api
```

### 4. 停止

```bash
docker compose down
```

---

## データベース管理

### Prisma Studio起動

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` を開いてデータベースを管理できます。

### マイグレーション作成

```bash
npx prisma migrate dev --name your_migration_name
```

---

## 動作確認フロー

### 1. 管理者による手動ライセンス発行

```bash
curl -X POST http://localhost:3001/v1/admin/issue \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-api-key-here" \
  -d '{"email": "test@example.com"}'
```

レスポンスから`licenseKey`を取得。

### 2. 初回アクティベーション

```bash
curl -X POST http://localhost:3001/v1/activate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "deviceId": "test-device-001"
  }'
```

`leaseToken`を取得。

### 3. ライセンス状態確認

```bash
curl -X GET http://localhost:3001/v1/status \
  -H "Authorization: Bearer <leaseToken>"
```

### 4. Lease Token更新

```bash
curl -X POST http://localhost:3001/v1/lease \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "deviceId": "test-device-001"
  }'
```

---

## Stripe連携テスト

### 1. Stripe CLIセットアップ

```bash
# ログイン
stripe login

# Webhook転送開始
stripe listen --forward-to localhost:3001/v1/webhooks/stripe
```

表示される`webhook signing secret`を`.env`の`STRIPE_WEBHOOK_SECRET`に設定。

### 2. イベント送信テスト

```bash
# チェックアウト完了イベント
stripe trigger checkout.session.completed

# サブスク更新イベント
stripe trigger customer.subscription.updated

# サブスク削除イベント
stripe trigger customer.subscription.deleted
```

### 3. ログ確認

サーバーログで以下が表示されることを確認：
```
Checkout completed for customer: cus_xxx
Subscription updated: sub_xxx - active
Subscription deleted: sub_xxx
```

---

## 既知の注意点と運用上のポイント

### ⚠️ セキュリティ

1. **JWT_SECRETは必ず変更**
   - `.env.example`の値は絶対に本番で使わない
   - `openssl rand -base64 32`で生成した値を使用

2. **ADMIN_API_KEYの厳重管理**
   - Admin APIは全権限を持つため、キーの漏洩は致命的
   - 定期的にローテーション推奨

3. **Stripe Webhook Secretの検証**
   - 署名検証をスキップしない（`constructEvent`で必須）

### ⚠️ 運用

1. **サブスクが切れてもログインすぐ不可ではない**
   - Lease Tokenが72時間有効
   - 厳密に即時停止したい場合は、`/v1/status`で`subscriptionStatus`を毎回確認

2. **端末変更リクエスト時の対応**
   - 現状は1台固定（deviceId変更不可）
   - 端末変更が必要な場合は、DBで`license.deviceId`を手動でNULLにする

3. **データベースバックアップ**
   - PostgreSQLのバックアップを定期的に取得
   - `docker compose exec postgres pg_dump -U postgres merfox_licenses > backup.sql`

4. **ログ監視**
   - Stripe Webhookの失敗ログを監視
   - `docker compose logs api | grep ERROR`

### ⚠️ 障害時の対応

1. **Stripe Webhookが届かない**
   - Stripe Dashboardで再送可能
   - 手動で`/v1/admin/issue`で補完

2. **データベース接続エラー**
   - `docker compose restart postgres`
   - `DATABASE_URL`の確認

3. **ライセンスが無効化されない**
   - Subscription statusが`active`のままになっていないか確認
   - Stripe Dashboardでサブスク状態を確認

---

## ディレクトリ構造

```
license-server/
├── src/
│   ├── routes/
│   │   ├── activate.ts      # POST /v1/activate
│   │   ├── lease.ts          # POST /v1/lease
│   │   ├── status.ts         # GET /v1/status
│   │   ├── admin.ts          # POST /v1/admin/issue
│   │   └── webhooks.ts       # POST /v1/webhooks/stripe
│   ├── utils/
│   │   ├── jwt.ts            # JWT生成/検証
│   │   ├── licenseKey.ts     # ライセンスキー生成
│   │   └── auth.ts           # Admin認証middleware
│   └── index.ts              # Express server
├── prisma/
│   └── schema.prisma         # データモデル
├── docker-compose.yml        # Docker設定
├── Dockerfile                # API Dockerイメージ
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 次のステップ

1. **本番VPSにデプロイ**
   - `.env`に本番値を設定
   - `docker compose up -d`で起動

2. **Stripe本番Webhookの設定**
   - Stripe DashboardでWebhook URLを設定
   - `https://your-domain.com/v1/webhooks/stripe`

3. **監視・ログ設定**
   - ログ管理ツール導入（Logtail, Papertrailなど）
   - アラート設定（ライセンス発行失敗時など）

4. **クライアント統合**
   - MerFoxクライアントに`/v1/activate`と`/v1/lease`を実装
   - Lease Tokenをローカルに保存してオフライン検証

---

## サポート

問題があれば以下を確認：
- サーバーログ: `docker compose logs api`
- データベース: `npx prisma studio`
- Stripe Dashboard: イベント履歴とWebhook配信状況
