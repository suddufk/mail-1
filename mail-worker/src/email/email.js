import PostalMime from 'postal-mime';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import settingService from '../service/setting-service';
import attService from '../service/att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import roleService from '../service/role-service';
import userService from '../service/user-service';
import telegramService from '../service/telegram-service';
import aiService from '../service/ai-service';
import { emailListIncludes, normalizeEmailAddress, parseEmailList } from '../utils/email-list-utils';

export async function email(message, env, ctx) {

	try {

		const {
			receive,
			tgChatId,
			tgBotStatus,
			forwardStatus,
			forwardEmail,
			ruleEmail,
			ruleType,
			resendTokens,
			domainList,
			r2Domain,
			noRecipient,
			blackSubject,
			blackContent,
			blackFrom,
			aiCode,
			aiCodeFilter
		} = await settingService.query({ env });

		if (receive === settingConst.receive.CLOSE) {
			message.setReject('Service suspended');
			return;
		}

		const reader = message.raw.getReader();
		let content = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			content += new TextDecoder().decode(value);
		}

		const email = await PostalMime.parse(content);


		const blockFlag = checkBlock(blackSubject, blackContent, blackFrom, email);

		if (blockFlag) {
			message.setReject('Message rejected');
			return;
		}

		const account = await accountService.selectByEmailIncludeDel({ env: env }, message.to);

		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
			message.setReject('Recipient not found');
			return;
		}

		let userRow = {}

		if (account) {
			 userRow = await userService.selectByIdIncludeDel({ env: env }, account.userId);
		}

		if (account && userRow.email !== env.admin) {

			let { banEmail, availDomain } = await roleService.selectByUserId({ env: env }, account.userId);

			if (!roleService.hasAvailDomainPerm(availDomain, message.to)) {
				message.setReject('The recipient is not authorized to use this domain.');
				return;
			}

			if(roleService.isBanEmail(banEmail, email.from.address)) {
				message.setReject('The recipient is disabled from receiving emails.');
				return;
			}

		}


		if (!email.to) {
			email.to = [{ address: message.to, name: emailUtils.getName(message.to)}]
		}

		const toName = email.to.find(item => item.address === message.to)?.name || '';
		const code = await aiService.extractCode({ env }, email, { aiCode, aiCodeFilter });

		const params = {
			toEmail: message.to,
			toName: toName,
			sendEmail: email.from.address,
			name: email.from.name || emailUtils.getName(email.from.address),
			subject: email.subject,
			code,
			content: email.html,
			text: email.text,
			cc: email.cc ? JSON.stringify(email.cc) : '[]',
			bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
			recipient: JSON.stringify(email.to),
			inReplyTo: email.inReplyTo,
			relation: email.references,
			messageId: email.messageId,
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			isDel: isDel.DELETE,
			status: emailConst.status.SAVING
		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of email.attachments) {
			let attachment = { ...item };
			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content) + fileUtils.getExtFileName(item.filename);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		try {
			if (attachments.length > 0) {
				await attService.addAtt({ env }, attachments);
			}
		} catch (e) {
			console.error(e);
		}

		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);


		if (ruleType === settingConst.ruleType.RULE) {

			const ruleMatched = emailListIncludes(ruleEmail, message.to) || emailListIncludes(ruleEmail, account?.email);

			if (!ruleMatched) {
				return;
			}

		}

		//转发到TG
		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
			await telegramService.sendEmailToBot({ env }, emailRow)
		}

		//转发到其他邮箱
		if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {

			const emails = parseEmailList(forwardEmail);

			await Promise.all(emails.map(async forwardTo => {

				await forwardToEmail({ env }, message, emailRow, email, attachments, forwardTo, message.to, resendTokens, domainList);

			}));

		}

	} catch (e) {
		console.error('邮件接收异常: ', e);
		throw e
	}
}

async function forwardToEmail(c, message, emailRow, parsedEmail, attachments, forwardTo, fromEmail, resendTokens, domainList) {

	if (isInternalForwardTarget(domainList, forwardTo)) {
		await copyToInternalAccount(c, emailRow, attachments, forwardTo, fromEmail);
		return;
	}

	try {
		if (message.canBeForwarded === false) {
			throw new Error('Message cannot be forwarded by Cloudflare Email Routing');
		}
		await message.forward(forwardTo);
		return;
	} catch (e) {
		console.error(`转发邮箱 ${forwardTo} 失败：`, e);
	}

	try {
		await sendForwardCopy(c, parsedEmail, attachments, forwardTo, fromEmail, resendTokens);
	} catch (e) {
		console.error(`转发邮箱 ${forwardTo} 备用发送失败：`, e);
	}

}

async function copyToInternalAccount(c, sourceEmail, attachments, forwardTo, originalTo) {

	if (normalizeEmailAddress(forwardTo) === normalizeEmailAddress(originalTo)) {
		return;
	}

	const targetAccount = await resolveInternalForwardAccount(c, forwardTo);

	if (!targetAccount) {
		return;
	}

	const targetUser = await userService.selectByIdIncludeDel(c, targetAccount.userId);

	if (!targetUser || targetUser.isDel === isDel.DELETE) {
		console.error(`站内转发目标 ${forwardTo} 所属用户不存在或已删除`);
		return;
	}

	const emailCopy = {
		toEmail: targetAccount.email,
		toName: targetAccount.name || emailUtils.getName(targetAccount.email),
		sendEmail: sourceEmail.sendEmail,
		name: sourceEmail.name,
		subject: sourceEmail.subject,
		code: sourceEmail.code,
		content: sourceEmail.content,
		text: sourceEmail.text,
		cc: sourceEmail.cc,
		bcc: sourceEmail.bcc,
		recipient: sourceEmail.recipient,
		inReplyTo: sourceEmail.inReplyTo,
		relation: sourceEmail.relation,
		messageId: sourceEmail.messageId,
		userId: targetAccount.userId,
		accountId: targetAccount.accountId,
		isDel: isDel.NORMAL,
		status: emailConst.status.RECEIVE
	};

	const copiedEmail = await emailService.receive(c, emailCopy, [], '');
	await attService.copyAtt(c, attachments, targetAccount.userId, targetAccount.accountId, copiedEmail.emailId);
}

async function resolveInternalForwardAccount(c, forwardTo) {

	const targetAccount = await accountService.selectByEmailIncludeDel(c, forwardTo);

	if (targetAccount?.isDel === isDel.NORMAL) {
		return targetAccount;
	}

	if (targetAccount?.isDel === isDel.DELETE) {
		console.error(`站内转发目标 ${forwardTo} 已删除`);
		return null;
	}

	const targetUser = await userService.selectByEmailIncludeDel(c, forwardTo);

	if (!targetUser || targetUser.isDel === isDel.DELETE) {
		console.error(`站内转发目标 ${forwardTo} 不存在或已删除`);
		return null;
	}

	await accountService.insert(c, {
		email: targetUser.email,
		name: emailUtils.getName(targetUser.email),
		userId: targetUser.userId
	});

	return await accountService.selectByEmailIncludeDel(c, targetUser.email);
}

async function sendForwardCopy(c, email, attachments, forwardTo, fromEmail, resendTokens) {

	const accountEmail = fromEmail || email.to?.[0]?.address || c.env.admin;
	const domain = emailUtils.getDomain(accountEmail);
	const resendToken = resendTokens?.[domain];

	const params = {
		name: emailUtils.getName(accountEmail),
		accountEmail,
		receiveEmail: [forwardTo],
		subject: email.subject || '',
		text: email.text || '',
		html: email.html || '',
		attachments,
		sendType: 'forward'
	};

	if (c.env.email) {
		await emailService.sendByCloudflareEmail(c, params);
		return;
	}

	if (resendToken) {
		await emailService.sendByResend(resendToken, params);
		return;
	}

	throw new Error('No fallback email provider configured');

}

function isInternalForwardTarget(domainList, forwardTo) {
	const domain = normalizeEmailAddress(emailUtils.getDomain(forwardTo));
	return !!domain && domainList?.some(item => normalizeEmailAddress(item) === `@${domain}`);
}

function checkBlock(blackSubjectStr, blackContentStr, blackFromStr, email) {

	const blackFromList = blackFromStr ? blackFromStr.split(',') : []
	const blackContentList = blackContentStr ? blackContentStr.split(',') : []
	const blackSubjectList = blackSubjectStr ? blackSubjectStr.split(',') : []

	for (const blackSubject of blackSubjectList) {
		if (email.subject?.includes(blackSubject)) {
			return true
		}
	}

	for (const blackContent of blackContentList) {
		if (email.html?.includes(blackContent) || email.text?.includes(blackContent)) {
			return true
		}
	}

	for (const blackFrom of blackFromList) {
		if (email.from.address === blackFrom || emailUtils.getDomain(email.from.address) === blackFrom) {
			return true
		}
	}

	return false

}
