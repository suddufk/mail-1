/**
 * VPS KV Server — cloud-mail KV adapter backend
 * Drop-in replacement for Cloudflare KV namespace.
 *
 * Deploy on any VPS:
 *   KV_SECRET=your-secret PORT=3456 node server.js
 */

import http from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ─── In-memory store ─────────────────────────────────────────────────────────
// Entry shape: { value: string, isBase64: bool, metadata: object|null, expiresAt: number|null }
const store = new Map();
const PERSIST_FILE = './kv-data.json';

// Load persisted data on startup (skip expired entries)
if (existsSync(PERSIST_FILE)) {
  try {
    const raw = JSON.parse(readFileSync(PERSIST_FILE, 'utf8'));
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) {
      if (!v.expiresAt || v.expiresAt > now) store.set(k, v);
    }
    console.log(`[KV] Loaded ${store.size} keys from disk`);
  } catch (e) {
    console.warn('[KV] Failed to load persisted data:', e.message);
  }
}

// Persist to disk every 30s and on clean exit
function persist() {
  const obj = Object.fromEntries(store);
  writeFileSync(PERSIST_FILE, JSON.stringify(obj));
}
setInterval(persist, 30_000);
process.on('SIGINT',  () => { persist(); process.exit(0); });
process.on('SIGTERM', () => { persist(); process.exit(0); });

// ─── TTL cleanup ─────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt && v.expiresAt < now) store.delete(k);
  }
}, 60_000);

// ─── KV operations ───────────────────────────────────────────────────────────
function kvGet(key) {
  const entry = store.get(key);
  if (!entry) return { value: null, metadata: null, isBase64: false };
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    store.delete(key);
    return { value: null, metadata: null, isBase64: false };
  }
  return { value: entry.value, metadata: entry.metadata, isBase64: entry.isBase64 || false };
}

function kvPut(key, value, { metadata = null, expirationTtl = null, isBase64 = false } = {}) {
  const expiresAt = expirationTtl ? Date.now() + expirationTtl * 1000 : null;
  store.set(key, { value, isBase64, metadata, expiresAt });
}

function kvDelete(key) {
  if (Array.isArray(key)) key.forEach(k => store.delete(k));
  else store.delete(key);
}

function kvList(prefix = '') {
  const now = Date.now();
  const keys = [];
  for (const [k, v] of store.entries()) {
    if (v.expiresAt && v.expiresAt < now) { store.delete(k); continue; }
    if (k.startsWith(prefix)) keys.push({ name: k });
  }
  return { keys, list_complete: true };
}

// ─── HTTP server ─────────────────────────────────────────────────────────────
const SECRET = process.env.KV_SECRET;
const PORT   = process.env.PORT || 3456;

if (!SECRET) {
  console.error('[KV] ERROR: KV_SECRET environment variable is required');
  process.exit(1);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end',  () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  // Auth
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${SECRET}`) {
    return send(res, 401, { error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' });

  let body;
  try { body = await readBody(req); }
  catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { op, key, value, metadata, expirationTtl, isBase64, prefix } = body;

  try {
    switch (op) {
      case 'get':
        return send(res, 200, kvGet(key));

      case 'put':
        kvPut(key, value, { metadata, expirationTtl, isBase64 });
        return send(res, 200, { ok: true });

      case 'delete':
        kvDelete(key);
        return send(res, 200, { ok: true });

      case 'list':
        return send(res, 200, kvList(prefix));

      case 'getWithMetadata':
        return send(res, 200, kvGet(key)); // value + metadata + isBase64

      default:
        return send(res, 400, { error: `Unknown op: ${op}` });
    }
  } catch (e) {
    console.error('[KV] Error:', e);
    return send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`[KV] Server listening on port ${PORT}`);
  console.log(`[KV] Store size: ${store.size} keys`);
});
