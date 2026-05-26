import KvConst from '../const/kv-const';
import tools from './tools';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'cloud-mail', version: '1.0.0' };

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version',
	'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate',
	'Access-Control-Max-Age': '86400'
};

function jsonResp(body, status = 200, extra = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra }
	});
}

function unauthorized(reason) {
	return new Response(JSON.stringify({ error: reason }), {
		status: 401,
		headers: {
			'Content-Type': 'application/json',
			'WWW-Authenticate': `Bearer realm="cloud-mail-mcp"${reason === 'agent token invalid' ? ' error="invalid_token"' : ''}`,
			...CORS_HEADERS
		}
	});
}

async function authenticate(req, env) {
	const token = req.headers.get('Authorization');
	if (!token) return unauthorized('agent token required');
	const stored = await env.kv.get(KvConst.AGENT_KEYS, { type: 'json' });
	const tokens = Array.isArray(stored?.tokens) ? stored.tokens : [];
	const matched = tokens.find(t => t && t.token === token);
	if (!matched) return unauthorized('agent token invalid');
	return matched;
}

function buildCtx(req, env, matchedToken) {
	return {
		env,
		req: {
			header: (name) => req.headers.get(name),
			raw: req,
			url: req.url,
			method: req.method
		},
		set: () => {},
		get: (key) => (key === 'agentToken' ? { id: matchedToken.id, name: matchedToken.name } : undefined)
	};
}

async function handleMessage(c, msg) {
	if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
		return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
	}

	const { method, id, params } = msg;
	const isNotification = id === undefined || id === null;

	try {
		if (method === 'initialize') {
			return {
				jsonrpc: '2.0', id,
				result: {
					protocolVersion: PROTOCOL_VERSION,
					capabilities: { tools: { listChanged: false } },
					serverInfo: SERVER_INFO,
					instructions: 'Cloud Mail agent server. Use list_mailboxes to discover sender accounts, list_emails / get_email to read, send_email to write, mark_read / mark_unread / delete_email to manage state, get_attachment to download attachments by attId.'
				}
			};
		}

		if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
			return null;
		}

		if (method === 'ping') {
			return { jsonrpc: '2.0', id, result: {} };
		}

		if (method === 'tools/list') {
			return {
				jsonrpc: '2.0', id,
				result: {
					tools: tools.map(t => ({
						name: t.name,
						description: t.description,
						inputSchema: t.inputSchema
					}))
				}
			};
		}

		if (method === 'tools/call') {
			const name = params?.name;
			const tool = tools.find(t => t.name === name);
			if (!tool) {
				return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
			}
			try {
				const result = await tool.handler(c, params?.arguments || {});
				const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
				return {
					jsonrpc: '2.0', id,
					result: {
						content: [{ type: 'text', text }]
					}
				};
			} catch (e) {
				return {
					jsonrpc: '2.0', id,
					result: {
						content: [{ type: 'text', text: `Error: ${e.message || String(e)}` }],
						isError: true
					}
				};
			}
		}

		if (isNotification) return null;
		return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
	} catch (e) {
		if (isNotification) return null;
		return { jsonrpc: '2.0', id, error: { code: -32603, message: e.message || 'Internal error' } };
	}
}

export default {
	async handle(req, env) {

		if (req.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const auth = await authenticate(req, env);
		if (auth instanceof Response) return auth;

		if (req.method === 'GET') {
			return jsonResp({ error: 'server-initiated stream not supported' }, 405, { 'Allow': 'POST, OPTIONS, DELETE' });
		}

		if (req.method === 'DELETE') {
			return new Response(null, { status: 200, headers: CORS_HEADERS });
		}

		if (req.method !== 'POST') {
			return jsonResp({ error: 'method not allowed' }, 405, { 'Allow': 'POST, OPTIONS, DELETE' });
		}

		let body;
		try {
			body = await req.json();
		} catch (e) {
			return jsonResp({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
		}

		const c = buildCtx(req, env, auth);

		if (Array.isArray(body)) {
			const responses = [];
			for (const msg of body) {
				const r = await handleMessage(c, msg);
				if (r) responses.push(r);
			}
			if (responses.length === 0) {
				return new Response(null, { status: 202, headers: CORS_HEADERS });
			}
			return jsonResp(responses);
		}

		const response = await handleMessage(c, body);
		if (!response) {
			return new Response(null, { status: 202, headers: CORS_HEADERS });
		}
		return jsonResp(response);
	}
};
