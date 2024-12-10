import ejs from 'ejs';
import type { Request, Response } from 'express';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import Mail from '../util/Mail.js';

/**
 * リファラーエラー
 */
export default class ReferrerController extends Controller implements ControllerInterface {
	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		if (res.get('Access-Control-Allow-Origin') === undefined) {
			this.logger.error(`Access-Control-Allow-Origin ヘッダが存在しない: ${req.get('User-Agent') ?? ''}`);
			res.status(403).end();
			return;
		}

		const contentType = req.get('Content-Type');
		if (contentType !== 'application/json') {
			this.logger.error(`Content-Type ヘッダ値 <${String(contentType)}> が想定外: ${req.get('User-Agent') ?? ''}`);
			res.status(403).end();
			return;
		}

		const location = req.body.location as string | undefined;
		const referrer = req.body.referrer as string | undefined;

		if (location === undefined || referrer === undefined) {
			this.logger.error(`パラメーター location（${String(location)}）, referrer${String(referrer)}）のいずれかが未設定: ${req.get('User-Agent') ?? ''}`);
			res.status(403).end();
			return;
		}

		/* エラー内容をDBに記録 */
		const dbFilePath = process.env['SQLITE_REPORT'];
		if (dbFilePath === undefined) {
			throw new Error('DB file path not defined');
		}

		const dao = new ReportReferrerDao(dbFilePath);
		await dao.insert(location, referrer);

		/* エラー内容を通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/referrer_mail.ejs`, {
			location: location,
			referrer: referrer,
			ua: req.get('User-Agent') ?? null,
			ip: req.ip,
		});
		await new Mail().sendHtml(process.env['REFERRER_MAIL_TITLE'], html);

		res.status(204).end();
	}
}
