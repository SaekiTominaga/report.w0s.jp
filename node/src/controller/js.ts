import ejs from 'ejs';
import { Hono } from 'hono';
import Log4js from 'log4js';
import ReportJsDao from '../dao/ReportJsDao.js';
import { cors as corsMiddleware } from '../middleware/cors.js';
import { env } from '../util/env.js';
import Mail from '../util/Mail.js';
import { json as jsonValidator } from '../validator/js.js';

/**
 * JavaScript エラー
 */
const logger = Log4js.getLogger('js');

const app = new Hono().post('/', corsMiddleware, jsonValidator, async (context) => {
	const { req } = context;

	const { location, message, filename, lineno, colno } = req.valid('json');

	const ua = req.header('User-Agent');

	const dao = new ReportJsDao(env('SQLITE_REPORT'));

	const existSameData = await dao.same({
		documentURL: location,
		message: message,
		jsURL: filename,
		lineNumber: lineno,
		columnNumber: colno,
		ua: ua,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			documentURL: location,
			message: message,
			jsURL: filename,
			lineNumber: lineno,
			columnNumber: colno,
			ua: ua,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('VIEWS')}/js_mail.ejs`, {
			location: location,
			message: message,
			filename: filename,
			lineno: lineno,
			colno: colno,
			ua: ua,
		});

		await new Mail().sendHtml(env('JS_MAIL_TITLE'), html);
	} else {
		logger.info('重複データにつき DB 登録スルー');
	}

	return new Response(null, {
		status: 204,
	});
});

export default app;
