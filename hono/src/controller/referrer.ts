import ejs from 'ejs';
import { Hono } from 'hono';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import ReportReferrerDao from '../db/Referrer.ts';
import Mail from '../util/Mail.ts';
import { json as jsonValidator } from '../validator/referrer.ts';

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

	const dao = new ReportReferrerDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_REPORT')}`);

	const existSameData = await dao.same({
		document_url: documentURL,
		referrer: referrer,
	});

	if (!existSameData) {
		/* DB に登録 */
		await dao.insert({
			document_url: documentURL,
			referrer: referrer,
		});

		/* メール通知 */
		const html = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/mail/referrer.ejs`, {
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
