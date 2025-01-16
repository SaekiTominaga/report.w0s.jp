import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import ip from 'ip';
import Log4js from 'log4js';
import ReportJsDao from '../dao/ReportJsDao.js';
import { cors as corsMiddleware } from '../middleware/cors.js';
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
	const ipAddress = ip.address();

	const dbFilePath = process.env['SQLITE_REPORT'];
	if (dbFilePath === undefined) {
		throw new HTTPException(500, { message: 'DB file path not defined' });
	}

	const dao = new ReportJsDao(dbFilePath);

	const existSameData = await dao.same({
		pageURL: location,
		message: message,
		jsURL: filename,
		lineNumber: lineno,
		columnNumber: colno,
		ua: ua,
		ip: ipAddress,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			pageURL: location,
			message: message,
			jsURL: filename,
			lineNumber: lineno,
			columnNumber: colno,
			ua: ua,
			ip: ipAddress,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/js_mail.ejs`, {
			location: location,
			message: message,
			filename: filename,
			lineno: lineno,
			colno: colno,
			ua: ua,
			ip: ipAddress,
		});

		await new Mail().sendHtml(process.env['JS_MAIL_TITLE'], html);
	} else {
		logger.info('重複データにつき DB 登録スルー');
	}

	return new Response(null, {
		status: 204,
	});
});

export default app;
