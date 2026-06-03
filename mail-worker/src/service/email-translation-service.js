import { and, eq } from 'drizzle-orm';
import orm from '../entity/orm';
import emailTranslation from '../entity/email-translation';

const emailTranslationService = {
	select(c, emailId, targetLang) {
		return orm(c).select().from(emailTranslation).where(
			and(
				eq(emailTranslation.emailId, emailId),
				eq(emailTranslation.targetLang, targetLang)
			)
		).get();
	},

	remove(c, emailId, targetLang) {
		return orm(c).delete(emailTranslation).where(
			and(
				eq(emailTranslation.emailId, emailId),
				eq(emailTranslation.targetLang, targetLang)
			)
		).run();
	},

	async save(c, params) {
		const data = {
			emailId: params.emailId,
			targetLang: params.targetLang,
			sourceLang: params.sourceLang,
			subject: params.subject || '',
			content: params.content || '',
			text: params.text || ''
		};

		return await orm(c).insert(emailTranslation).values(data).onConflictDoUpdate({
			target: [emailTranslation.emailId, emailTranslation.targetLang],
			set: {
				sourceLang: data.sourceLang,
				subject: data.subject,
				content: data.content,
				text: data.text
			}
		}).returning().get();
	}
};

export default emailTranslationService;
