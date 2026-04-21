import { describe, it, expect } from 'vitest';
import rateLimiter from '../src/utils/rate-limiter';

// Mock KV store
function createMockContext() {
	const store = {};
	return {
		env: {
			kv: {
				get: async (key) => store[key] || null,
				put: async (key, value) => { store[key] = value; },
				delete: async (key) => { delete store[key]; }
			}
		}
	};
}

describe('rate-limiter', () => {
	it('should allow requests under the limit', async () => {
		const c = createMockContext();
		await expect(rateLimiter.check(c, 'test:ip1', 3, 300)).resolves.toBeUndefined();
		await expect(rateLimiter.check(c, 'test:ip1', 3, 300)).resolves.toBeUndefined();
		await expect(rateLimiter.check(c, 'test:ip1', 3, 300)).resolves.toBeUndefined();
	});

	it('should block requests over the limit', async () => {
		const c = createMockContext();
		await rateLimiter.check(c, 'test:ip2', 2, 300);
		await rateLimiter.check(c, 'test:ip2', 2, 300);
		await expect(rateLimiter.check(c, 'test:ip2', 2, 300)).rejects.toThrow('Too many attempts');
	});

	it('should reset counter', async () => {
		const c = createMockContext();
		await rateLimiter.check(c, 'test:ip3', 1, 300);
		await expect(rateLimiter.check(c, 'test:ip3', 1, 300)).rejects.toThrow();
		await rateLimiter.reset(c, 'test:ip3');
		await expect(rateLimiter.check(c, 'test:ip3', 1, 300)).resolves.toBeUndefined();
	});

	it('should isolate different keys', async () => {
		const c = createMockContext();
		await rateLimiter.check(c, 'login:ip1', 1, 300);
		await expect(rateLimiter.check(c, 'login:ip2', 1, 300)).resolves.toBeUndefined();
	});
});
