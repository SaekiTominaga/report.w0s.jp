import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import ip from 'ip';
import Log4js from 'log4js';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import { cors as corsMiddleware } from '../middleware/cors.js';
import Mail from '../util/Mail.js';
import { json as jsonValidator } from '../validator/referrer.js';

/**
 * リファラーエラー
 */
const logger = Log4js.getLogger('referrer');

const app = new Hono().post('/', corsMiddleware, jsonValidator, async (context) => {
	const { req } = context;

	const { location, referrer } = req.valid('json');

	const ua = req.header('User-Agent');
	const ipAddress = ip.address();

	const dbFilePath = process.env['SQLITE_REPORT'];
	if (dbFilePath === undefined) {
		throw new HTTPException(500, { message: 'DB file path not defined' });
	}

	const dao = new ReportReferrerDao(dbFilePath);

	const existSameData = await dao.same({
		pageUrl: location,
		referrer: referrer,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			pageUrl: location,
			referrer: referrer,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/referrer_mail.ejs`, {
			location: location,
			referrer: referrer,
			ua: ua,
			ip: ipAddress,
		});

		await new Mail().sendHtml(process.env['REFERRER_MAIL_TITLE'], html);
	} else {
		logger.info('重複データにつき DB 登録スルー');
	}

	return new Response(null, {
		status: 204,
	});
});

export default app;
