import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/utils/sanitize-utils';

describe('sanitize-utils', () => {
	it('should remove script tags', () => {
		const html = '<div>Hello</div><script>alert("xss")</script>';
		expect(sanitizeHtml(html)).not.toContain('<script');
		expect(sanitizeHtml(html)).toContain('Hello');
	});

	it('should remove iframe tags', () => {
		const html = '<p>Text</p><iframe src="evil.com"></iframe>';
		expect(sanitizeHtml(html)).not.toContain('<iframe');
		expect(sanitizeHtml(html)).toContain('Text');
	});

	it('should remove event handlers', () => {
		const html = '<img src="x.png" onerror="alert(1)" />';
		const result = sanitizeHtml(html);
		expect(result).not.toContain('onerror');
		expect(result).toContain('src="x.png"');
	});

	it('should remove javascript: URLs', () => {
		const html = '<a href="javascript:alert(1)">click</a>';
		const result = sanitizeHtml(html);
		expect(result).not.toContain('javascript:');
	});

	it('should preserve safe HTML', () => {
		const html = '<p>Hello <strong>world</strong></p><img src="photo.jpg" />';
		const result = sanitizeHtml(html);
		expect(result).toContain('<p>');
		expect(result).toContain('<strong>');
		expect(result).toContain('photo.jpg');
	});

	it('should handle null/empty input', () => {
		expect(sanitizeHtml(null)).toBe('');
		expect(sanitizeHtml('')).toBe('');
	});

	it('should truncate content over 500KB', () => {
		const huge = 'a'.repeat(600000);
		const result = sanitizeHtml(huge);
		expect(result.length).toBeLessThanOrEqual(510000); // some overhead from parsing
	});
});
