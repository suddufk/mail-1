import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

async function expectAppShell(response) {
	expect(response.status).toBe(200);
	const text = await response.text();
	expect(text).toContain('<title>Cloud Mail</title>');
	expect(text).toContain('<div id="root"></div>');
}

describe('Cloud Mail worker', () => {
	it('serves the app shell (unit style)', async () => {
		const request = new Request('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		await expectAppShell(response);
	});

	it('serves the app shell (integration style)', async () => {
		const response = await SELF.fetch('http://example.com');
		await expectAppShell(response);
	});
});
