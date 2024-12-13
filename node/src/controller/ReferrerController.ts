import ejs from 'ejs';
import ip from 'ip';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import Mail from '../util/Mail.js';
import type { RequestBody } from '../validator/referrer.js';

/**
 * リファラーエラー
 */
export default class ReferrerController extends Controller implements ControllerInterface {
	async execute(context: Context): Promise<Response> {
		const { req } = context;

		const { location, referrer }: RequestBody = req.valid('json' as never);

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
		}

		return new Response(null, {
			status: 204,
		});
	}
}
