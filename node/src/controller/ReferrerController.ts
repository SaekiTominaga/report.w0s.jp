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

		/* エラー内容をDBに記録 */
		const dbFilePath = process.env['SQLITE_REPORT'];
		if (dbFilePath === undefined) {
			throw new HTTPException(500, { message: 'DB file path not defined' });
		}

		const dao = new ReportReferrerDao(dbFilePath);
		await dao.insert({
			location: location,
			referrer: referrer,
		});

		/* エラー内容を通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/referrer_mail.ejs`, {
			location: location,
			referrer: referrer,
			ua: ua,
			ip: ipAddress,
		});
		await new Mail().sendHtml(process.env['REFERRER_MAIL_TITLE'], html);

		return new Response(null, {
			status: 204,
		});
	}
}
