# Cloud Mail MCP Server

Cloud Mail exposes a [Model Context Protocol](https://modelcontextprotocol.io/)
server directly on the same Cloudflare Worker. LLM agents (Claude
Code, Claude Desktop, Cursor, etc.) can connect with a single URL + token, no
local process required.

## Endpoint

```
https://<your-domain>/mcp
```

- Transport: **Streamable HTTP** (the current MCP transport — supersedes the
  older SSE-only endpoints)
- Protocol version: `2025-06-18`
- Auth: same agent token as the REST `/api/agent/*` surface (see
  [AGENT_API.md](AGENT_API.md) for how to mint one)
- One endpoint handles every method: `POST` for JSON-RPC requests,
  `OPTIONS` for CORS preflight, `DELETE` for session termination
  (acknowledged but stateless), `GET` is not used.

A bare `https://<your-domain>/api/mcp` alias is also accepted, in case your
client prepends `/api`.

## Client configuration

### Claude Code / Claude Desktop

Add to your `~/.claude/mcp.json` (or `claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "cloud-mail": {
      "type": "http",
      "url": "https://<your-domain>/mcp",
      "headers": {
        "Authorization": "<your-agent-token>"
      }
    }
  }
}
```

Restart the client; tools should appear under the `cloud-mail` namespace.

### Cursor / Cline / generic remote MCP clients

Most clients accept the same shape — URL + headers. If a client only supports
the legacy SSE transport, this endpoint is not yet compatible; ask for
Streamable HTTP support upstream.

## Tools

| Tool | Description |
| --- | --- |
| `list_mailboxes` | List sending accounts (returns `{list,total,page,size}`) |
| `list_emails` | List emails with filters: `mailbox`, `type`, `unread`, `q`, `page`, `size`, `after`, `before` |
| `get_email` | Full content + attachment metadata for one email |
| `send_email` | Send / reply. Required: `from`, `to[]`, `subject`. Optional: `text`, `html`, `replyTo`, `name`, `attachments[]` |
| `mark_read` / `mark_unread` | Toggle the unread flag |
| `delete_email` | Soft-delete by id list |
| `get_attachment` | Download an attachment as `{filename, mimeType, size, base64}` |

The full input schema for each tool is returned by the `tools/list` RPC and
will be presented in the agent's tool catalog automatically.

## Auth flow

1. Admin mints an agent token via the REST endpoint
   (`POST /api/agent/auth/token`, see [AGENT_API.md](AGENT_API.md)) — same
   credential is used for both REST and MCP.
2. Client sends `Authorization: <token>` on every MCP request.
3. Missing or unknown tokens are rejected with HTTP **401** and a
   `WWW-Authenticate: Bearer ...` header (per MCP spec).
4. Revoking a token via `POST /api/agent/auth/revoke` invalidates both REST
   and MCP access for that token instantly.

## Manual test

```bash
# init handshake
curl -s -X POST https://<your-domain>/mcp \
  -H 'Authorization: <token>' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

# list tools
curl -s -X POST https://<your-domain>/mcp \
  -H 'Authorization: <token>' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# call a tool
curl -s -X POST https://<your-domain>/mcp \
  -H 'Authorization: <token>' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_mailboxes","arguments":{"size":5}}}'
```

## Notes

- The server is **stateless** — no session storage; every request stands
  alone. Sessions / resumable streams are intentionally not implemented to
  keep the worker simple. If your client requires session tracking, set the
  `Mcp-Session-Id` header to any stable value; the server will accept and
  ignore it.
- Tool results are returned as a single `text` content block containing
  pretty-printed JSON. This makes them readable as fallback to clients that
  don't render structured content.
- All operations execute under the admin scope (the agent token is admin-
  level by construction — only admin can mint one). Per-user scoping is not
  enforced inside MCP.
