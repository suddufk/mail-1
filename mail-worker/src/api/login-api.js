import app from '../hono/hono';
import loginService from '../service/login-service';
import result from '../model/result';
import userContext from '../security/user-context';
import rateLimiter from '../utils/rate-limiter';
import sanitizeUtils from '../utils/sanitize-utils';

app.post('/login', async (c) => {
	const ip = rateLimiter.getClientIp(c);
	if (await rateLimiter.isLimited(c.env, `login:${ip}`, 5, 60)) {
		return c.json(result.fail('Too many login attempts, please try again later', 429), 429);
	}
	const params = sanitizeUtils.sanitizeParams(await c.req.json());
	const token = await loginService.login(c, params);
	return c.json(result.ok({ token: token }));
});

app.post('/register', async (c) => {
	const ip = rateLimiter.getClientIp(c);
	if (await rateLimiter.isLimited(c.env, `register:${ip}`, 3, 300)) {
		return c.json(result.fail('Too many registration attempts, please try again later', 429), 429);
	}
	const params = sanitizeUtils.sanitizeParams(await c.req.json());
	const jwt = await loginService.register(c, params);
	return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
	await loginService.logout(c, userContext.getUserId(c));
	return c.json(result.ok());
});

