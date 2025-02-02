import ejs from 'ejs';
import { Hono } from 'hono';
import Log4js from 'log4js';
import ReportJsDao from '../dao/ReportJsDao.js';
import { env } from '../util/env.js';
import Mail from '../util/Mail.js';
import { json as jsonValidator } from '../validator/js.js';

/**
 * JavaScript エラー
 */
const logger = Log4js.getLogger('js');

export const jsApp = new Hono().post(jsonValidator, async (context) => {
	const { req } = context;

	const { documentURL, message, jsURL, lineNumber, columnNumber } = req.valid('json');

	const ua = req.header('User-Agent');

	const dao = new ReportJsDao(env('SQLITE_REPORT'));

	const existSameData = await dao.same({
		documentURL: documentURL,
		message: message,
		jsURL: jsURL,
		lineNumber: lineNumber,
		columnNumber: columnNumber,
		ua: ua,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			documentURL: documentURL,
			message: message,
			jsURL: jsURL,
			lineNumber: lineNumber,
			columnNumber: columnNumber,
			ua: ua,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('VIEWS')}/js_mail.ejs`, {
			documentURL: documentURL,
			message: message,
			jsURL: jsURL,
			lineNumber: lineNumber,
			columnNumber: columnNumber,
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
