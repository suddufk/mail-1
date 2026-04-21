import orm from '../../entity/orm';
import email from '../../entity/email';
import { attConst, emailConst, isDel, settingConst } from '../../const/entity-const';
import { and, eq, inArray } from 'drizzle-orm';
import settingService from '../setting-service';
import accountService from '../account-service';
import BizError from '../../error/biz-error';
import emailUtils from '../../utils/email-utils';
import { Resend } from 'resend';
import attService from '../att-service';
import userService from '../user-service';
import roleService from '../role-service';
import dayjs from 'dayjs';
import kvConst from '../../const/kv-const';
import { t } from '../../i18n/i18n';
import account from '../../entity/account';
import { att } from '../../entity/att';

const emailSendService = {

	async send(c, params, userId, { selectById, imgReplace }) {

		let { accountId, name, sendType, emailId, receiveEmail, text, content, subject, attachments } = params;

		const { resendTokens, r2Domain, send, domainList } = await settingService.query(c);
		let { imageDataList, html } = await attService.toImageUrlHtml(c, content);

		if (send === settingConst.send.CLOSE) {
			throw new BizError(t('disabledSend'), 403);
		}

		const userRow = await userService.selectById(c, userId);
		const roleRow = await roleService.selectById(c, userRow.type);

		const allInternal = receiveEmail.every(e => {
			const domain = '@' + emailUtils.getDomain(e);
			return domainList.includes(domain);
		});

		if (c.env.admin !== userRow.email) {
			if (roleRow.sendType === 'ban') throw new BizError(t('bannedSend'), 403);
			if (roleRow.sendType === 'internal' && !allInternal) throw new BizError(t('onlyInternalSend'), 403);
		}

		if (c.env.admin !== userRow.email && roleRow.sendCount) {
			if (userRow.sendCount >= roleRow.sendCount) {
				if (roleRow.sendType === 'day') throw new BizError(t('daySendLimit'), 403);
				if (roleRow.sendType === 'count') throw new BizError(t('totalSendLimit'), 403);
			}
			if (userRow.sendCount + receiveEmail.length > roleRow.sendCount) {
				if (roleRow.sendType === 'day') throw new BizError(t('daySendLack'), 403);
				if (roleRow.sendType === 'count') throw new BizError(t('totalSendLack'), 403);
			}
		}

		const accountRow = await accountService.selectById(c, accountId);
		if (!accountRow) throw new BizError(t('senderAccountNotExist'));
		if (accountRow.userId !== userId) throw new BizError(t('sendEmailNotCurUser'));

		if (c.env.admin !== userRow.email) {
			if (!roleService.hasAvailDomainPerm(roleRow.availDomain, accountRow.email)) {
				throw new BizError(t('noDomainPermSend'), 403);
			}
		}

		const domain = emailUtils.getDomain(accountRow.email);
		const resendToken = resendTokens[domain];

		if (!resendToken && !allInternal) throw new BizError(t('noResendToken'));
		if (!name) name = emailUtils.getName(accountRow.email);

		let emailRow = { messageId: null };

		if (sendType === 'reply') {
			emailRow = await selectById(c, emailId);
			if (!emailRow) throw new BizError(t('notExistEmailReply'));
		}

		let resendResult = {};

		if (!allInternal) {
			const resend = new Resend(resendToken);
			const sendForm = {
				from: `${name} <${accountRow.email}>`,
				to: [...receiveEmail],
				subject, text, html,
				attachments: [...imageDataList, ...attachments]
			};
			if (sendType === 'reply') {
				sendForm.headers = { 'in-reply-to': emailRow.messageId, 'references': emailRow.messageId };
			}
			resendResult = await resend.emails.send(sendForm);
		}

		const { data, error } = resendResult;
		if (error) throw new BizError(error.message);

		imageDataList = imageDataList.map(item => ({ ...item, contentId: `<${item.contentId}>` }));
		html = imgReplace(html, imageDataList, r2Domain);

		const emailData = {
			sendEmail: accountRow.email, name, subject, content: html, text,
			accountId, status: emailConst.status.SENT, type: emailConst.type.SEND,
			userId, resendEmailId: data?.id
		};

		const recipient = receiveEmail.map(item => ({ address: item, name: '' }));
		emailData.recipient = JSON.stringify(recipient);

		if (sendType === 'reply') {
			emailData.inReplyTo = emailRow.messageId;
			emailData.relation = emailRow.messageId;
		}

		if (roleRow.sendCount && roleRow.sendType !== 'internal') {
			await userService.incrUserSendCount(c, receiveEmail.length, userId);
		}

		const emailResult = await orm(c).insert(email).values(emailData).returning().get();

		if (imageDataList.length > 0) {
			if (imageDataList.length > 10) throw new BizError(t('imageAttLimit'));
			await attService.saveArticleAtt(c, imageDataList, userId, accountId, emailResult.emailId);
		}

		if (attachments?.length > 0) {
			if (attachments.length > 10) throw new BizError(t('attLimit'));
			await attService.saveSendAtt(c, attachments, userId, accountId, emailResult.emailId);
		}

		const attList = await attService.selectByEmailIds(c, [emailResult.emailId]);
		emailResult.attList = attList;

		if (allInternal) {
			await this.handleOnSiteEmail(c, receiveEmail, emailResult, attList);
		}

		const dateStr = dayjs().format('YYYY-MM-DD');
		let daySendTotal = await c.env.kv.get(kvConst.SEND_DAY_COUNT + dateStr);

		if (!daySendTotal) {
			await c.env.kv.put(kvConst.SEND_DAY_COUNT + dateStr, JSON.stringify(receiveEmail.length), { expirationTtl: 86400 });
		} else {
			daySendTotal = Number(daySendTotal) + receiveEmail.length;
			await c.env.kv.put(kvConst.SEND_DAY_COUNT + dateStr, JSON.stringify(daySendTotal), { expirationTtl: 86400 });
		}

		return [emailResult];
	},

	async handleOnSiteEmail(c, receiveEmail, sendEmailData, attList) {
		const { noRecipient } = await settingService.query(c);
		let accountList = await orm(c).select().from(account).where(inArray(account.email, receiveEmail)).all();
		const userIds = accountList.map(a => a.userId);
		let roleList = await roleService.selectByUserIds(c, userIds);

		const emailDataList = [];

		for (const addr of receiveEmail) {
			const emailValues = { ...sendEmailData };
			emailValues.status = emailConst.status.RECEIVE;
			emailValues.type = emailConst.type.RECEIVE;
			emailValues.toEmail = addr;
			emailValues.toName = emailUtils.getName(addr);
			emailValues.emailId = null;

			const accountRow = accountList.find(a => a.email === addr);

			if (accountRow) {
				emailValues.userId = accountRow.userId;
				emailValues.accountId = accountRow.accountId;

				const roleRow = roleList.find(r => r.userId === accountRow.userId);
				const { banEmail, availDomain } = roleRow;

				if (addr !== c.env.admin) {
					if (!roleService.hasAvailDomainPerm(availDomain, addr)) {
						emailValues.status = emailConst.status.BOUNCED;
						emailValues.message = `The recipient <${addr}> is not authorized to use this domain.`;
					} else if (roleService.isBanEmail(banEmail, sendEmailData.sendEmail)) {
						emailValues.status = emailConst.status.BOUNCED;
						emailValues.message = `The recipient <${addr}> is disabled from receiving emails.`;
					}
				}
			} else {
				emailValues.userId = 0;
				emailValues.accountId = 0;
				emailValues.status = emailConst.status.NOONE;

				if (noRecipient === settingConst.noRecipient.CLOSE) {
					emailValues.status = emailConst.status.BOUNCED;
					emailValues.message = `Recipient not found: <${addr}>`;
				}
			}

			emailDataList.push(emailValues);
		}

		const receiveEmailList = emailDataList.filter(e => e.status === emailConst.status.RECEIVE || e.status === emailConst.status.NOONE);

		for (const emailData of receiveEmailList) {
			const emailRow = await orm(c).insert(email).values(emailData).returning().get();
			for (const attRow of attList) {
				const attValues = { ...attRow, emailId: emailRow.emailId, accountId: emailRow.accountId, userId: emailRow.userId, attId: null };
				await orm(c).insert(att).values(attValues).run();
			}
		}

		const bouncedEmail = emailDataList.find(e => e.status === emailConst.status.BOUNCED);
		let status = emailConst.status.DELIVERED;
		let message = '';

		if (bouncedEmail) {
			message = JSON.stringify({ message: bouncedEmail.message });
			status = emailConst.status.BOUNCED;
		}

		await orm(c).update(email).set({ status, message }).where(eq(email.emailId, sendEmailData.emailId)).run();
	}
};

export default emailSendService;
