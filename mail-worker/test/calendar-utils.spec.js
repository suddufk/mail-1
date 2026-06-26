import { describe, expect, it } from 'vitest';
import { parseICalendar } from '../src/utils/calendar-utils.js';

describe('calendar utils', () => {
	it('parses Teams meeting details from text/calendar content', () => {
		const ics = [
			'BEGIN:VCALENDAR',
			'METHOD:REQUEST',
			'BEGIN:VEVENT',
			'SUMMARY:DRP Platform walk thru.',
			'DTSTART:20250625T101500Z',
			'DTEND:20250625T104500Z',
			'LOCATION:Microsoft Teams Meeting',
			'DESCRIPTION:Spotkanie w Microsoft Teams\\nDołącz: https://teams.microsoft.com/meet/393216444363987?p=T9WoiCoPPDN20XYhdQ\\nIdentyfikator spotkania: 393 216 444 363 987\\nKod dostępu: KY3kJ9PY',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\n');

		const event = parseICalendar(ics);

		expect(event.summary).toBe('DRP Platform walk thru.');
		expect(event.location).toBe('Microsoft Teams Meeting');
		expect(event.start.iso).toBe('2025-06-25T10:15:00.000Z');
		expect(event.end.iso).toBe('2025-06-25T10:45:00.000Z');
		expect(event.teamsUrl).toBe('https://teams.microsoft.com/meet/393216444363987?p=T9WoiCoPPDN20XYhdQ');
		expect(event.meetingId).toBe('393 216 444 363 987');
		expect(event.accessCode).toBe('KY3kJ9PY');
	});

	it('unfolds continued iCalendar lines', () => {
		const ics = [
			'BEGIN:VCALENDAR',
			'BEGIN:VEVENT',
			'SUMMARY:Long ',
			' meeting',
			'DTSTART;TZID=Central European Standard Time:20250625T121500',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');

		const event = parseICalendar(ics);

		expect(event.summary).toBe('Long meeting');
		expect(event.start.local).toBe('2025-06-25T12:15:00');
		expect(event.start.timeZone).toBe('Central European Standard Time');
	});
});
