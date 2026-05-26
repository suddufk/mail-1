import agentService from '../service/agent-service';

async function fetchAttachmentBase64(c, attId) {
	const { obj, meta } = await agentService.fetchAttachment(c, attId);
	const source = obj instanceof Response ? obj : new Response(obj.body);
	const buf = await source.arrayBuffer();
	const bytes = new Uint8Array(buf);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return {
		attId: meta.attId,
		filename: meta.filename,
		mimeType: meta.mimeType,
		size: meta.size,
		base64: btoa(binary)
	};
}

const tools = [
	{
		name: 'list_mailboxes',
		description: 'List configured mailboxes (sending accounts). Returns {list, total, page, size}. Each list item has accountId, email, name, userId.',
		inputSchema: {
			type: 'object',
			properties: {
				email: { type: 'string', description: 'optional case-insensitive substring filter on mailbox email address' },
				page: { type: 'integer', minimum: 1, default: 1 },
				size: { type: 'integer', minimum: 1, maximum: 200, default: 50 }
			}
		},
		handler: (c, args) => agentService.listMailboxes(c, args)
	},
	{
		name: 'list_emails',
		description: 'List emails with filters. Returns {list, total, page, size} where each item has emailId, subject, sendEmail, toEmail, createTime, type (0=receive 1=send), unread (0=read 1=unread), text snippet, content (html), attList[]. Use mailbox or accountId to scope to one mailbox; without either, lists across all mailboxes.',
		inputSchema: {
			type: 'object',
			properties: {
				mailbox: { type: 'string', description: 'mailbox email address (exact match, case-insensitive)' },
				accountId: { type: 'integer', description: 'alternative to mailbox' },
				type: { type: 'string', enum: ['receive', 'send'], description: 'restrict to received or sent emails' },
				unread: { type: 'string', enum: ['0', '1'], description: '1 = unread only, 0 = read only, omit for both' },
				q: { type: 'string', description: 'keyword search over subject/text/content/from/to (case-insensitive substring)' },
				page: { type: 'integer', minimum: 1, default: 1 },
				size: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
				after: { type: 'string', description: 'createTime >= this. Format: YYYY-MM-DD HH:MM:SS' },
				before: { type: 'string', description: 'createTime <= this. Format: YYYY-MM-DD HH:MM:SS' }
			}
		},
		handler: (c, args) => agentService.listEmails(c, args)
	},
	{
		name: 'get_email',
		description: 'Get a single email by id, including full HTML content, plain text, and attachment metadata (attList).',
		inputSchema: {
			type: 'object',
			properties: { id: { type: 'integer', description: 'emailId' } },
			required: ['id']
		},
		handler: (c, args) => agentService.getEmail(c, args.id)
	},
	{
		name: 'send_email',
		description: 'Send an email. The from address must be an existing mailbox in the system (use list_mailboxes to discover). Provide at least one of text or html. To reply to an existing email, set replyTo to that email id so message threading is preserved.',
		inputSchema: {
			type: 'object',
			properties: {
				from: { type: 'string', description: 'sender mailbox email (must be registered)' },
				to: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'recipient email addresses' },
				subject: { type: 'string' },
				text: { type: 'string', description: 'plain-text body' },
				html: { type: 'string', description: 'HTML body (preferred when both provided)' },
				replyTo: { type: 'integer', description: 'emailId being replied to (optional)' },
				name: { type: 'string', description: 'sender display name; defaults to the mailbox local-part' },
				attachments: {
					type: 'array',
					description: 'optional attachments',
					items: {
						type: 'object',
						properties: {
							filename: { type: 'string' },
							content: { type: 'string', description: 'base64-encoded bytes or a data: URL' },
							contentType: { type: 'string', description: 'MIME type, e.g. application/pdf' }
						},
						required: ['filename', 'content']
					}
				}
			},
			required: ['from', 'to', 'subject']
		},
		handler: (c, args) => agentService.sendEmail(c, args)
	},
	{
		name: 'mark_read',
		description: 'Mark an email as read (sets unread=0).',
		inputSchema: {
			type: 'object',
			properties: { id: { type: 'integer' } },
			required: ['id']
		},
		handler: async (c, args) => {
			await agentService.setReadFlag(c, args.id, true);
			return { ok: true, id: args.id, unread: 0 };
		}
	},
	{
		name: 'mark_unread',
		description: 'Mark an email as unread (sets unread=1).',
		inputSchema: {
			type: 'object',
			properties: { id: { type: 'integer' } },
			required: ['id']
		},
		handler: async (c, args) => {
			await agentService.setReadFlag(c, args.id, false);
			return { ok: true, id: args.id, unread: 1 };
		}
	},
	{
		name: 'delete_email',
		description: 'Soft-delete one or more emails by id (sets isDel=1; rows remain in DB and are excluded from list/get queries).',
		inputSchema: {
			type: 'object',
			properties: {
				ids: { type: 'array', items: { type: 'integer' }, minItems: 1, description: 'emailId list' }
			},
			required: ['ids']
		},
		handler: async (c, args) => {
			await agentService.softDelete(c, args.ids);
			return { ok: true, deleted: args.ids };
		}
	},
	{
		name: 'get_attachment',
		description: 'Download an attachment by attId. Returns {attId, filename, mimeType, size, base64} where base64 is the file content. Find attId values inside attList on emails returned by get_email/list_emails.',
		inputSchema: {
			type: 'object',
			properties: { attId: { type: 'integer' } },
			required: ['attId']
		},
		handler: (c, args) => fetchAttachmentBase64(c, args.attId)
	}
];

export default tools;
