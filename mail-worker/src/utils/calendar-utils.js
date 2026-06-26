export function parseICalendar(content = '') {
	const lines = unfoldLines(String(content));
	const props = {};
	let inEvent = false;

	for (const line of lines) {
		const separatorIndex = line.indexOf(':');
		if (separatorIndex === -1) {
			continue;
		}

		const rawName = line.slice(0, separatorIndex);
		const rawValue = line.slice(separatorIndex + 1);
		const { name, params } = parsePropertyName(rawName);
		const value = decodeICalValue(rawValue);

		if (name === 'BEGIN' && value.toUpperCase() === 'VEVENT') {
			inEvent = true;
			continue;
		}

		if (name === 'END' && value.toUpperCase() === 'VEVENT') {
			break;
		}

		if (!inEvent && name !== 'METHOD') {
			continue;
		}

		if (!props[name]) {
			props[name] = [];
		}

		props[name].push({ value, params });
	}

	const description = firstValue(props.DESCRIPTION);
	const url = firstValue(props.URL);
	const teamsUrl = findTeamsUrl([url, description, firstValue(props.LOCATION)].filter(Boolean).join('\n'));

	return {
		method: firstValue(props.METHOD),
		summary: firstValue(props.SUMMARY),
		location: firstValue(props.LOCATION),
		description,
		url,
		teamsUrl,
		meetingId: findMeetingId(description),
		accessCode: findAccessCode(description),
		start: parseICalDate(firstEntry(props.DTSTART)),
		end: parseICalDate(firstEntry(props.DTEND))
	};
}

export function isCalendarAttachment(attachment = {}) {
	const mimeType = String(attachment.mimeType || attachment.contentType || '').toLowerCase();
	const filename = String(attachment.filename || '').toLowerCase();
	return mimeType.includes('text/calendar') || mimeType.includes('application/ics') || filename.endsWith('.ics');
}

function unfoldLines(content) {
	return content
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.split('\n')
		.reduce((result, line) => {
			if (/^[ \t]/.test(line) && result.length) {
				result[result.length - 1] += line.slice(1);
			} else {
				result.push(line);
			}
			return result;
		}, []);
}

function parsePropertyName(rawName) {
	const parts = rawName.split(';');
	const name = parts.shift().toUpperCase();
	const params = {};

	for (const part of parts) {
		const eqIndex = part.indexOf('=');
		if (eqIndex === -1) {
			continue;
		}

		const key = part.slice(0, eqIndex).toUpperCase();
		const value = part.slice(eqIndex + 1).replace(/^"|"$/g, '');
		params[key] = value;
	}

	return { name, params };
}

function decodeICalValue(value) {
	return String(value)
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\')
		.trim();
}

function firstEntry(entries) {
	return entries?.[0] || null;
}

function firstValue(entries) {
	return firstEntry(entries)?.value || '';
}

function parseICalDate(entry) {
	if (!entry?.value) {
		return null;
	}

	const value = entry.value.trim();
	const timeZone = entry.params?.TZID || '';

	if (/^\d{8}$/.test(value)) {
		return {
			raw: value,
			allDay: true,
			local: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
			timeZone
		};
	}

	const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
	if (!match) {
		return { raw: value, timeZone };
	}

	const [, year, month, day, hour, minute, second = '00', utcFlag] = match;

	if (utcFlag) {
		return {
			raw: value,
			iso: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))).toISOString(),
			timeZone: 'UTC'
		};
	}

	return {
		raw: value,
		local: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
		timeZone
	};
}

function findTeamsUrl(text) {
	const match = String(text).match(/https:\/\/teams\.microsoft\.com\/[^\s<>"']+/i);
	return match ? match[0].replace(/[),.;]+$/, '') : '';
}

function findMeetingId(text = '') {
	const match = text.match(/(?:meeting id|identyfikator spotkania|会议\s*id|會議\s*id|会议号|會議識別碼)\s*[:：]\s*([0-9 ]{6,})/i);
	return match ? match[1].trim() : '';
}

function findAccessCode(text = '') {
	const match = text.match(/(?:passcode|kod dostępu|access code|会议密码|會議密碼|存取碼|密码)\s*[:：]\s*([A-Za-z0-9]+)/i);
	return match ? match[1].trim() : '';
}
