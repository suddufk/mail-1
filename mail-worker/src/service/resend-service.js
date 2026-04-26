import { Resend } from 'resend';
import emailService from './email-service';
import accountService from './account-service';
import settingService from './setting-service';
import attService from './att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import BizError from '../error/biz-error';

const resendService = {

	async webhooks(c, body) {

		const params = {
			resendEmailId: body.data?.email_id || body.email_id,
			status: emailConst.status.SENT
		}

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.message = null
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED
			params.message = body.data.failed.reason
		}

		if (body.type === 'email.received') {
			const data = body.data || {};
			
			const getEmail = (obj) => typeof obj === 'string' ? obj : (obj && (obj.email || obj.address || ''));
			const toAddress = getEmail(data.to?.[0] || body.to?.[0] || '');
			const fromAddress = getEmail(data.from || body.from || '');
			const subject = data.subject || body.subject || '';
			let htmlContent = data.html || body.html || '';
			let textContent = data.text || body.text || '';
			const emailId = data.email_id || body.email_id || '';

			if (!toAddress) {
				throw new BizError('Missing recipient address');
			}

			const account = await accountService.selectByEmailIncludeDel(c, toAddress);
			const { r2Domain, resendTokens } = await settingService.query(c);

			// If body is missing, try to fetch it from Resend API
			if (!htmlContent && !textContent && emailId) {
				try {
					const domain = emailUtils.getDomain(toAddress);
					const resendToken = resendTokens[domain];
					if (resendToken) {
						const resend = new Resend(resendToken);
						const emailDetail = await resend.emails.get(emailId);
						if (emailDetail && emailDetail.data) {
							htmlContent = emailDetail.data.html || '';
							textContent = emailDetail.data.text || '';
						}
					}
				} catch (e) {
					console.error('Failed to fetch email detail from Resend:', e);
				}
			}

			const attachments = [];
			const cidAttachments = [];

			const payloadAttachments = data.attachments || body.attachments || [];
			if (payloadAttachments.length > 0) {
				for (let item of payloadAttachments) {
					const buff = fileUtils.base64ToUint8Array(item.content);
					const key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(buff) + fileUtils.getExtFileName(item.name);
					const attachment = {
						key: key,
						filename: item.name,
						mimeType: item.contentType,
						size: buff.length,
						content: buff,
						contentId: item.contentId,
						userId: account ? account.userId : 0,
						accountId: account ? account.accountId : 0,
					};
					attachments.push(attachment);
					if (item.contentId) {
						cidAttachments.push(attachment);
					}
				}
			}

			const receiveParams = {
				toEmail: toAddress,
				toName: emailUtils.getName(toAddress),
				sendEmail: fromAddress,
				name: emailUtils.getName(fromAddress),
				subject: subject,
				content: htmlContent || (textContent ? textContent.replace(/\n/g, '<br>') : ''),
				text: textContent || '',
				recipient: JSON.stringify((data.to || body.to || []).map(addr => ({ address: getEmail(addr), name: '' }))),
				resendEmailId: emailId,
				userId: account ? account.userId : 0,
				accountId: account ? account.accountId : 0,
				isDel: isDel.DELETE,
				status: emailConst.status.SAVING,
				type: emailConst.type.RECEIVE
			};

			let emailRow = await emailService.receive(c, receiveParams, cidAttachments, r2Domain);

			if (attachments.length > 0) {
				attachments.forEach(att => att.emailId = emailRow.emailId);
				await attService.addAtt(c, attachments);
			}

			await emailService.completeReceive(c, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);
			return;
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			throw new BizError('更新邮件状态记录失败');
		}

	}
}

export default resendService
