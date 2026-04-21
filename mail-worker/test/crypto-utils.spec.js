import { describe, it, expect } from 'vitest';
import cryptoUtils from '../src/utils/crypto-utils';

describe('crypto-utils', () => {
	it('should hash password with PBKDF2 and verify', async () => {
		const { salt, hash } = await cryptoUtils.hashPassword('testpass123');
		expect(salt).toBeTruthy();
		expect(hash).toMatch(/^pbkdf2:/);
		expect(await cryptoUtils.verifyPassword('testpass123', salt, hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('wrongpass', salt, hash)).toBe(false);
	});

	it('should generate unique salts', async () => {
		const r1 = await cryptoUtils.hashPassword('same');
		const r2 = await cryptoUtils.hashPassword('same');
		expect(r1.salt).not.toBe(r2.salt);
		expect(r1.hash).not.toBe(r2.hash);
	});

	it('should verify legacy SHA-256 hashes', async () => {
		// Simulate legacy hash (salt + password → SHA-256)
		const salt = cryptoUtils.generateSalt();
		const legacyHash = await cryptoUtils.genLegacyHash('oldpass', salt);
		expect(legacyHash).not.toMatch(/^pbkdf2:/);
		expect(await cryptoUtils.verifyPassword('oldpass', salt, legacyHash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('wrong', salt, legacyHash)).toBe(false);
	});

	it('should detect hashes needing upgrade', async () => {
		const { hash: newHash } = await cryptoUtils.hashPassword('test');
		const legacyHash = await cryptoUtils.genLegacyHash('test', 'salt');
		expect(cryptoUtils.needsUpgrade(newHash)).toBe(false);
		expect(cryptoUtils.needsUpgrade(legacyHash)).toBe(true);
	});

	it('should generate random passwords of correct length', () => {
		const pwd = cryptoUtils.genRandomPwd(12);
		expect(pwd).toHaveLength(12);
		expect(pwd).toMatch(/^[A-Za-z0-9]+$/);
	});
});
