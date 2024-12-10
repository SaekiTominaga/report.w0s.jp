import ejs from 'ejs';
import type { Request, Response } from 'express';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import ReportJsDao from '../dao/ReportJsDao.js';
import Mail from '../util/Mail.js';

/**
 * JavaScript エラー
 */
export default class JsController extends Controller implements ControllerInterface {
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
		const message = req.body.message as string | undefined;
		const filename = req.body.filename as string | undefined;
		const lineno = req.body.lineno !== undefined ? Number(req.body.lineno) : undefined;
		const colno = req.body.colno !== undefined ? Number(req.body.colno) : undefined;

		if (location === undefined || message === undefined || filename === undefined || lineno === undefined || colno === undefined) {
			this.logger.error(
				`パラメーター location（${String(location)}）, message（${String(message)}）, filename（${String(filename)}）, lineno（${String(
					lineno,
				)}）, colno（${String(colno)}）のいずれかが未設定: ${req.get('User-Agent') ?? ''}`,
			);
			res.status(403).end();
			return;
		}

		/* エラー内容をDBに記録 */
		const dbFilePath = process.env['SQLITE_REPORT'];
		if (dbFilePath === undefined) {
			throw new Error('DB file path not defined');
		}

		const dao = new ReportJsDao(dbFilePath);
		await dao.insert(req, location, message, filename, lineno, colno);

		/* エラー内容を通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/js_mail.ejs`, {
			location: location,
			message: message,
			filename: filename,
			lineno: lineno,
			colno: colno,
			ua: req.get('User-Agent') ?? null,
			ip: req.ip,
		});

		await new Mail().sendHtml(process.env['JS_MAIL_TITLE'], html);

		res.status(204).end();
	}
}
