import ejs from 'ejs';
import { Hono } from 'hono';
import Log4js from 'log4js';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import { env } from '../util/env.js';
import Mail from '../util/Mail.js';
import { json as jsonValidator } from '../validator/referrer.js';

/**
 * リファラーエラー
 */
const logger = Log4js.getLogger('referrer');

export const referrerApp = new Hono().post(jsonValidator, async (context) => {
	const { req } = context;

	const responseBody = req.valid('json');
	const { documentURL, referrer } = responseBody;
	logger.debug(responseBody);

	const ua = req.header('User-Agent');

	const dao = new ReportReferrerDao(env('SQLITE_REPORT'));

	const existSameData = await dao.same({
		documentURL: documentURL,
		referrer: referrer,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			documentURL: documentURL,
			referrer: referrer,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('VIEWS')}/referrer_mail.ejs`, {
			documentURL: documentURL,
			referrer: referrer,
			ua: ua,
		});

		await new Mail().sendHtml(env('REFERRER_MAIL_TITLE'), html);
	} else {
		logger.info('重複データにつき DB 登録スルー');
	}

	return new Response(null, {
		status: 204,
	});
});
