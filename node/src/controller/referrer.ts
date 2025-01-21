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

const app = new Hono().post('/', jsonValidator, async (context) => {
	const { req } = context;

	const responseBody = req.valid('json');
	const { location, referrer } = responseBody;
	logger.debug(responseBody);

	const ua = req.header('User-Agent');

	const dao = new ReportReferrerDao(env('SQLITE_REPORT'));

	const existSameData = await dao.same({
		documentURL: location,
		referrer: referrer,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			documentURL: location,
			referrer: referrer,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('VIEWS')}/referrer_mail.ejs`, {
			location: location,
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

export default app;
