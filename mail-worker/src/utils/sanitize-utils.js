const sanitizeUtils = {

	/**
	 * Sanitize string input — strip HTML tags and dangerous characters
	 */
	sanitizeString(input) {
		if (typeof input !== 'string') return input;
		return input
			.replace(/[<>]/g, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '')
			.trim();
	},

	/**
	 * Sanitize email address — only allow valid email characters
	 */
	sanitizeEmail(email) {
		if (typeof email !== 'string') return '';
		return email.replace(/[^a-zA-Z0-9@._+\-]/g, '').toLowerCase().trim();
	},

	/**
	 * Sanitize object fields recursively (shallow, string fields only)
	 */
	sanitizeParams(params) {
		if (!params || typeof params !== 'object') return params;
		const clean = {};
		for (const [key, value] of Object.entries(params)) {
			clean[key] = typeof value === 'string' ? this.sanitizeString(value) : value;
		}
		return clean;
	}
};

export default sanitizeUtils;
