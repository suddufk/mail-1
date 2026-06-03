import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const emailTranslation = sqliteTable('email_translation', {
	translationId: integer('translation_id').primaryKey({ autoIncrement: true }),
	emailId: integer('email_id').notNull(),
	targetLang: text('target_lang').default('').notNull(),
	sourceLang: text('source_lang').default('').notNull(),
	subject: text('subject').default('').notNull(),
	content: text('content').default('').notNull(),
	text: text('text').default('').notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => ({
	emailTargetIdx: uniqueIndex('idx_email_translation_email_lang').on(table.emailId, table.targetLang)
}));

export default emailTranslation;
