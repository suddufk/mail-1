const rateLimiter = {

	/**
	 * Check if request exceeds rate limit using KV store
	 * @param {object} env - Cloudflare env with kv binding
	 * @param {string} key - Unique identifier (IP or userId)
	 * @param {number} maxRequests - Max requests allowed in window
	 * @param {number} windowSeconds - Time window in seconds
	 * @returns {boolean} true if rate limited
	 */
	async isLimited(env, key, maxRequests = 10, windowSeconds = 60) {
		const kvKey = `rl:${key}`;
		const record = await env.kv.get(kvKey, { type: 'json' });

		if (!record) {
			await env.kv.put(kvKey, JSON.stringify({ count: 1, ts: Date.now() }), {
				expirationTtl: windowSeconds
			});
			return false;
		}

		if (record.count >= maxRequests) {
			return true;
		}

		record.count += 1;
		const remaining = windowSeconds - Math.floor((Date.now() - record.ts) / 1000);
		await env.kv.put(kvKey, JSON.stringify(record), {
			expirationTtl: Math.max(remaining, 1)
		});
		return false;
	},

	/**
	 * Get client IP from request
	 */
	getClientIp(c) {
		return c.req.header('cf-connecting-ip') ||
			c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
			'unknown';
	}
};

export default rateLimiter;
