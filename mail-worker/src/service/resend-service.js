import emailService from './email-service';
import accountService from './account-service';
import settingService from './setting-service';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import BizError from '../error/biz-error';

const resendService = {

	async webhooks(c, body) {

		const params = {
			resendEmailId: body.data.email_id,
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
			const data = body.data;
			const toAddress = data.to[0];
			const account = await accountService.selectByEmailIncludeDel(c, toAddress);
			const { r2Domain } = await settingService.query(c);

			const receiveParams = {
				toEmail: toAddress,
				toName: emailUtils.getName(toAddress),
				sendEmail: data.from,
				name: emailUtils.getName(data.from),
				subject: data.subject,
				content: data.html || (data.text ? data.text.replace(/\n/g, '<br>') : ''),
				text: data.text || '',
				recipient: JSON.stringify(data.to.map(addr => ({ address: addr, name: '' }))),
				resendEmailId: data.email_id,
				userId: account ? account.userId : 0,
				accountId: account ? account.accountId : 0,
				isDel: isDel.DELETE,
				status: emailConst.status.SAVING,
				type: emailConst.type.RECEIVE
			};

			let emailRow = await emailService.receive(c, receiveParams, [], r2Domain);
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
