import { parseHTML } from 'linkedom';
import { attConst } from '../../const/entity-const';
import attService from '../att-service';
import domainUtils from '../../utils/domain-uitls';

const emailContentService = {

	imgReplace(content, cidAttList, r2domain) {
		if (!content) return '';

		const { document } = parseHTML(content);
		const images = Array.from(document.querySelectorAll('img'));
		const useAtts = [];

		for (const img of images) {
			const src = img.getAttribute('src');

			if (src && src.startsWith('cid:') && cidAttList) {
				const cid = src.replace(/^cid:/, '');
				const attCidIndex = cidAttList.findIndex(cidAtt => cidAtt.contentId.replace(/^<|>$/g, '') === cid);
				if (attCidIndex > -1) {
					const cidAtt = cidAttList[attCidIndex];
					img.setAttribute('src', '{{domain}}' + cidAtt.key);
					useAtts.push(cidAtt);
				}
			}

			r2domain = domainUtils.toOssDomain(r2domain);

			if (src && src.startsWith(r2domain + '/')) {
				img.setAttribute('src', src.replace(r2domain + '/', '{{domain}}'));
			}
		}

		useAtts.forEach(att => { att.type = attConst.type.EMBED; });
		return document.toString();
	},

	async emailAddAtt(c, list) {
		const emailIds = list.map(item => item.emailId);
		if (emailIds.length > 0) {
			const attList = await attService.selectByEmailIds(c, emailIds);
			list.forEach(emailRow => {
				emailRow.attList = attList.filter(attRow => attRow.emailId === emailRow.emailId);
			});
		}
	}
};

export default emailContentService;
