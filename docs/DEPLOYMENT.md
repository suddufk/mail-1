# Deployment Guide

Complete guide for deploying Cloud Mail to Cloudflare Workers.

## Prerequisites

- Cloudflare account with a domain configured
- Node.js 20+ and pnpm installed
- `wrangler` CLI authenticated (`pnpm wrangler login`)

## Step 1: Create Cloudflare Resources

```bash
# Set your account ID (find it in Cloudflare dashboard)
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Create D1 database
pnpm wrangler d1 create cloud-mail
# Note the database_id from output

# Create KV namespace
pnpm wrangler kv namespace create cloud-mail
# Note the id from output

# Create R2 bucket
pnpm wrangler r2 bucket create cloud-mail
```

## Step 2: Configure wrangler-prod.toml

```bash
cp mail-worker/wrangler-prod.toml.example mail-worker/wrangler-prod.toml
```

Edit `wrangler-prod.toml` and fill in:

- `account_id`: Your Cloudflare account ID
- `database_id`: From D1 create output
- KV `id`: From KV create output
- `domain`: Your email domain as JSON array `["example.com"]`
- `admin`: Admin email address `"admin@example.com"`
- `jwt_secret`: Random 32+ char string (`openssl rand -base64 32 | tr -d '/+='`)
- `init_secret`: Different random string (used once for DB init)
- `allowed_origins`: Frontend URL `["https://mail.example.com"]`
- Route `pattern`: `"mail.example.com/*"`
- Route `zone_name`: `"example.com"`

**IMPORTANT**: This file contains secrets. It is excluded from git via `.gitignore`.

## Step 3: Create Frontend .env

```bash
cat > mail-vue/.env.release << EOF
NODE_ENV=release
VITE_APP_TITLE=Cloud Mail
VITE_BASE_URL=/api
VITE_PWA_NAME=Cloud Mail
VITE_OUT_DIR=../mail-worker/dist
EOF
```

**CRITICAL**: The `VITE_OUT_DIR=../mail-worker/dist` is required. Without it, the
frontend builds to `mail-vue/dist` instead of `mail-worker/dist`, and the Worker
cannot find the static assets.

## Step 4: DNS Configuration

Create a proxied DNS record pointing to your Worker:

```bash
# Using Cloudflare API (requires Global API Key or DNS-edit token)
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: YOUR_GLOBAL_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "mail",
    "content": "192.0.2.1",
    "proxied": true,
    "ttl": 1
  }'
```

### Known Issues with DNS

- **wrangler OAuth token does NOT have DNS write permissions**. You need either
  the Global API Key or a dedicated API Token with "Zone DNS Edit" permissions.
- **Workers subdomain**: Find yours with the API, not by guessing. The subdomain
  is NOT your username. Check via:
  `curl -s "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/workers/subdomain"`
- **A record with `192.0.2.1`** is the correct approach for Workers custom domains.
  Cloudflare's proxy intercepts the traffic and routes it to the Worker. Do NOT
  use a CNAME to `workers.dev` — it may not resolve if the subdomain is disabled.

## Step 5: Deploy

```bash
cd mail-worker
CLOUDFLARE_ACCOUNT_ID=your-account-id pnpm wrangler deploy --config wrangler-prod.toml
```

## Step 6: Initialize Database

**One-time only.** Wait 10-15 seconds after deploy for DNS propagation.

```bash
curl "https://mail.example.com/api/init/YOUR_INIT_SECRET"
# Should return: success
```

If DNS hasn't propagated yet, use `--resolve`:

```bash
curl --resolve "mail.example.com:443:CLOUDFLARE_IP" \
  "https://mail.example.com/api/init/YOUR_INIT_SECRET"
```

The init endpoint is protected:

- Uses `init_secret` (separate from `jwt_secret`)
- Can only run once (KV flag prevents re-execution)
- Logs IP and timestamp for audit

## Step 7: Enable Registration and Configure

```bash
# Enable registration (disabled by default)
CLOUDFLARE_ACCOUNT_ID=your-account-id pnpm wrangler d1 execute cloud-mail \
  --remote --command "UPDATE setting SET register = 0, reg_key = 0, register_verify = 0" \
  --config wrangler-prod.toml
```

Then register with your admin email at `https://mail.example.com`.

## Step 8: Email Routing

```bash
# Enable Email Routing via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/email/routing/enable" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Create catch-all rule to Worker
curl -X PUT "https://api.cloudflare.com/client/v4/zones/ZONE_ID/email/routing/rules/catch_all" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "enabled": true,
    "name": "catch-all to cloud-mail worker",
    "matchers": [{"type": "all"}],
    "actions": [{"type": "worker", "value": ["cloud-mail"]}]
  }'
```

Cloudflare automatically creates MX and SPF records.

## Step 9: External Email Sending (Optional)

To send emails outside your domain, configure [Resend](https://resend.com/):

1. Create Resend account and verify your domain
2. Generate API key
3. In admin panel: System Settings -> add Resend Token for your domain

## Troubleshooting

### "Database not initialized" error

The KV cache of settings was cleared. Fix:

```bash
# Delete the SYSTEM_INITIALIZED flag
pnpm wrangler kv key delete --namespace-id YOUR_KV_ID "SYSTEM_INITIALIZED" --remote

# Re-run init
curl "https://mail.example.com/api/init/YOUR_INIT_SECRET"
```

### Attachments not downloading (404 or empty)

**Root cause**: The original code always served attachments from KV regardless of
storage type. Fixed in this fork — `index.js` now checks `r2Service.storageType()`
and serves from R2 when configured.

### Rate limiting blocking login

If you get "Too many attempts" during testing:

```bash
pnpm wrangler kv key delete --namespace-id YOUR_KV_ID "RATE:login:your@email.com" --remote
```

### Slow page loads from South America

D1 databases are created in a specific region (ENAM = US East by default). Each
API call from South America adds ~400-600ms latency. Mitigations:

- Create D1 with `--location=wnam` (US West, slightly closer)
- The frontend caches static assets aggressively (`immutable` cache headers)
- First load is slow, subsequent loads use browser cache

### Settings changes not taking effect

Settings are cached in KV. After direct D1 changes, refresh the cache:

```bash
pnpm wrangler kv key delete --namespace-id YOUR_KV_ID "setting:" --remote
# Then re-init or wait for next request
```
