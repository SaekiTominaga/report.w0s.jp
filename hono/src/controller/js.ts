import path from 'node:path';
import ejs from 'ejs';
import { Hono } from 'hono';
import { env } from '@w0s/env-value-type';
import { getLogger } from '../logger.ts';
import ReportJsDao from '../db/JS.ts';
import Mail from '../util/Mail.ts';
import { json as jsonValidator } from '../validator/js.ts';

/**
 * JavaScript エラー
 */
const logger = getLogger(path.basename(import.meta.url, '.ts'));

export const jsApp = new Hono().post(jsonValidator, async (context) => {
	const { req } = context;

	const { documentURL, message, jsURL, lineNumber, columnNumber } = req.valid('json');

	const ua = req.header('User-Agent');

	const dao = new ReportJsDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_REPORT')}`);

	const existSameData = await dao.same({
		document_url: documentURL,
		message: message,
		js_url: jsURL,
		line_number: lineNumber,
		column_number: columnNumber,
		ua: ua,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			document_url: documentURL,
			message: message,
			js_url: jsURL,
			line_number: lineNumber,
			column_number: columnNumber,
			ua: ua,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/mail/js.ejs`, {
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
