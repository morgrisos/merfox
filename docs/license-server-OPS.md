# MerFox License Server - Operations Runbook

**Version**: 1.1  
**Last Updated**: 2026-02-18  
**Mode**: Manual Operation (Stripe-free)

---

## Table of Contents

1. [Daily Checks](#1-daily-checks)
2. [Issue (License Creation)](#2-issue-license-creation)
3. [Extend (Renewal)](#3-extend-renewal)
4. [Suspend (Immediate Stop)](#4-suspend-immediate-stop)
5. [Search (License Lookup)](#5-search-license-lookup)
6. [Device Reset (Change Device)](#6-device-reset-change-device)
7. [Emergency Procedures](#7-emergency-procedures)
8. [Security Notes](#8-security-notes)
9. [Database Restore Procedure](#9-database-restore-procedure)

---

## 1. Daily Checks

### Health Check

```bash
# Local
curl -sS http://127.0.0.1:3001/health

# External
curl -sS http://85.131.247.80:3001/health

# Expected: {"ok":true,"service":"merfox-license-server"}
```

### Docker Status

```bash
cd /home/merfox/license-server
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected:
# merfox-license-api   Up X minutes   0.0.0.0:3001->3001/tcp
# merfox-license-db    Up X minutes   5432/tcp
```

### Recent Errors (Last 1 Hour)
docker compose logs --since=1h api | grep -i error

### Recent Logs

```bash
docker compose logs --tail=50 api
docker compose logs --tail=50 postgres

# Check for errors
docker compose logs --since=24h api | grep -i error
```

---

## 2. Issue (License Creation)

**Purpose**: Create new license with 32-day initial subscription

**Command**:
```bash
cd /home/merfox/license-server
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)

curl -X POST http://127.0.0.1:3001/v1/admin/issue \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d '{
    "email": "customer@example.com",
    "note": "Initial purchase - YYYY-MM-DD"
  }' | jq
```

**Response Fields**:
- `ok`: true if successful
- `licenseKey`: Full license key (starts with `MERFOX-`)
- `customerId`: Customer ID for reference
- `licenseId`: License ID
- `subscriptionId`: Auto-created subscription ID
- `note`: Your note

**Action**: 
1. Copy `licenseKey` and send to customer
2. Save `customerId` for future reference
3. Log transaction in your records

---

## 3. Extend (Renewal)

**Purpose**: Extend subscription period by specified days

**Command**:
```bash
cd /home/merfox/license-server
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)

# Monthly renewal (30 days)
curl -X POST http://127.0.0.1:3001/v1/admin/extend \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "days": 30
  }' | jq

# Annual renewal (365 days)
curl -X POST http://127.0.0.1:3001/v1/admin/extend \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "days": 365
  }' | jq
```

**Response Fields**:
- `ok`: true if successful
- `subscriptionId`: Subscription that was extended
- `currentPeriodEnd`: New expiration date (ISO 8601)
- `days`: Number of days added

**Notes**:
- Extends from current `currentPeriodEnd` (not from today)
- Reactivates subscription if it was expired
- Customer can use immediately after extension

---

## 4. Suspend (Immediate Stop)

**Purpose**: Immediately block license (payment failure, violation, chargeback)

**Command**:
```bash
cd /home/merfox/license-server
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)

curl -X POST http://127.0.0.1:3001/v1/admin/suspend \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d '{
    "licenseKey": "MERFOX-XXXX-XXXX-XXXX",
    "reason": "Payment failure / Violation / Chargeback"
  }' | jq
```

**Response Fields**:
- `ok`: true if successful
- `licenseKey`: License that was suspended
- `licenseStatus`: "suspended"
- `subscriptionStatus`: "canceled"
- `reason`: Your reason for audit trail

**Effects**:
- License immediately blocked (cannot activate, lease, or verify)
- Existing lease tokens become invalid within 72 hours (grace period)
- To reactivate: manually change `license.status` back to `'active'` in DB

**Notes**:
- Irreversible via API (use DB direct or re-issue to restore)
- Customer will see "License is not active" error

---

## 5. Search (License Lookup)

**Purpose**: Find license details for customer support

### Search by Email

```bash
cd /home/merfox/license-server
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)

curl "http://127.0.0.1:3001/v1/admin/licenses?email=customer@example.com" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq
```

### Search by License Key

```bash
cd /home/merfox/license-server
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)

curl "http://127.0.0.1:3001/v1/admin/licenses?licenseKey=MERFOX-XXXX-XXXX-XXXX" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq
```

**Response Fields**:
- `ok`: true if successful
- `count`: Number of licenses found
- `licenses[]`: Array of license details
  - `licenseKey`: Full license key
  - `licenseStatus`: `active`, `suspended`, etc.
  - `deviceId`: Bound device ID (null if not activated)
  - `activatedAt`: First activation timestamp
  - `lastSeenAt`: Last API call timestamp
  - `createdAt`: Creation timestamp
  - `customer`: Customer email and ID
  - `subscription`: Status, expiration, isExpired flag

**Use Cases**:
- Customer forgot license key
- Check subscription status
- Verify device binding
- Audit last usage time

---

## 6. Device Reset (Change Device)

**Purpose**: Unbind license from old device to allow activation on new device

**Scenario**: Customer needs to transfer license to new computer/device

### Method 1: SQL (Recommended)

```bash
cd /home/merfox/license-server

# Get license key from customer or search by email

# Reset deviceId to NULL
docker exec merfox-license-db psql -U postgres -d merfox_licenses -c \
  "UPDATE licenses SET \"deviceId\" = NULL WHERE \"licenseKey\" = 'MERFOX-XXXX-XXXX-XXXX';"

# Verify reset
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)
curl "http://127.0.0.1:3001/v1/admin/licenses?licenseKey=MERFOX-XXXX-XXXX-XXXX" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq '.licenses[0].deviceId'
# Should return: null
```

### Method 2: Prisma Studio (Interactive)

```bash
cd /home/merfox/license-server

# Open Prisma Studio
npx prisma studio

# Browser opens at http://localhost:5555
# 1. Navigate to "licenses" table
# 2. Search for licenseKey
# 3. Click row to edit
# 4. Set deviceId to null
# 5. Save

# Close studio when done
```

**After Reset**:
- Customer can activate on new device
- Old device lease tokens expire within 72 hours
- `activatedAt` and `lastSeenAt` are preserved (not reset)

**Important**: Verify customer identity before performing device reset

---

## 7. Emergency Procedures

### API Container Crash

```bash
cd /home/merfox/license-server

# Check logs
docker compose logs --tail=100 api

# Restart API only
docker compose restart api

# Full restart if needed
docker compose down
docker compose up -d
```

### Database Connection Issues

```bash
cd /home/merfox/license-server

# Check PostgreSQL status
docker compose logs --tail=50 postgres

# Check connection from API
docker exec merfox-license-api npx prisma db execute --stdin <<< "SELECT 1;"

# Restart both containers
docker compose down
docker compose up -d
```

### Schema Mismatch (Prisma)

```bash
cd /home/merfox/license-server

# Sync schema without data loss
docker compose run --rm api npx prisma db push --accept-data-loss

# Restart API
docker compose restart api
```

### Full Rebuild

```bash
cd /home/merfox/license-server

# Backup .env and data
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
docker compose exec postgres pg_dump -U postgres merfox_licenses > backup_$(date +%Y%m%d_%H%M%S).sql

# Rebuild
docker compose down
docker compose up -d --build

# Verify
curl http://127.0.0.1:3001/health
```

### Credential Rotation

```bash
cd /home/merfox/license-server

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Generate new keys
NEW_JWT_SECRET="$(openssl rand -base64 32)"
NEW_ADMIN_API_KEY="$(openssl rand -hex 32)"

# Update .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" .env
sed -i "s/^ADMIN_API_KEY=.*/ADMIN_API_KEY=${NEW_ADMIN_API_KEY}/" .env

# Full restart to load new credentials
docker compose down
docker compose up -d

# Verify
sleep 10
curl http://127.0.0.1:3001/health
```

**Note**: After rotation, existing lease tokens remain valid until expiration (72h)

---

## 8. Security Notes

### Critical Security Rules

1. **PostgreSQL Port 5432**:
   - ✅ **Must remain internal only** (`5432/tcp` in docker ps)
   - ❌ **Never expose** `0.0.0.0:5432->5432/tcp`
   - Verify: `docker ps | grep postgres` should show `5432/tcp` only
   - UFW rule: `ufw deny 5432/tcp`

2. **Admin API Key**:
   - Stored in `.env` as `ADMIN_API_KEY`
   - Required for all `/v1/admin/*` endpoints
   - Rotate regularly (monthly recommended)
   - Never commit to git or share in chat logs

3. **JWT Secret**:
   - Stored in `.env` as `JWT_SECRET`
   - Used for lease token signing
   - Rotate during security incidents
   - 256-bit minimum (32 bytes base64 or 64 chars hex)

4. **Backup Locations**:
   - `.env` backups: `/home/merfox/license-server/.env.bak.*`
   - SQL dumps: `/home/merfox/license-server/backup_*.sql`
   - Docker volumes: `docker volume ls | grep postgres_data`

5. **Log Retention**:
   - Docker logs: Auto-rotating, check with `docker compose logs`
   - PostgreSQL logs: Inside container at `/var/lib/postgresql/data/log/`
   - API logs: Stdout only (captured by Docker)

### Access Control

**Who needs access**:
- VPS SSH: Admin only
- Admin API key: Support team (read-only operations suggested)
- Database: Never expose externally

**Audit Trail**:
- License operations: Check `note` field in `/v1/admin/issue`
- Suspend reasons: Logged in `/v1/admin/suspend` response
- API access: Check `docker compose logs api | grep POST`

---

## 9. Database Restore Procedure

1. Stop containers:
docker compose down

2. Drop and recreate database:
docker compose up -d postgres
docker exec -i merfox-license-db psql -U postgres -c "DROP DATABASE merfox_licenses;"
docker exec -i merfox-license-db psql -U postgres -c "CREATE DATABASE merfox_licenses;"

3. Restore:
docker exec -i merfox-license-db psql -U postgres merfox_licenses < backup_YYYYMMDD.sql

4. Start API:
docker compose up -d

5. Verify:
curl http://127.0.0.1:3001/health
