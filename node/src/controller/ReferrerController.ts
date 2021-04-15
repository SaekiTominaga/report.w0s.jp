import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import { ReportW0SJp as Configure } from '../../configure/type/Report';
import { Request, Response } from 'express';

/**
 * リファラーエラー
 */
export default class ReferrerController extends Controller implements ControllerInterface {
	#config: Configure;

	constructor(config: Configure) {
		super();

		this.#config = config;
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		if (res.get('Access-Control-Allow-Origin') === undefined) {
			this.logger.error(`Access-Control-Allow-Origin ヘッダが存在しない: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}
		const contentType = req.get('Content-Type');
		if (contentType !== 'application/json') {
			this.logger.error(`Content-Type ヘッダ値 <${contentType}> が想定外: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const requestBody = req.body;
		const location: string | undefined = requestBody.location;
		const referrer: string | undefined = requestBody.referrer;

		if (location === undefined || referrer === undefined) {
			this.logger.error(`パラメーター location（${location}）, referrer${referrer}）のいずれかが未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		/* エラー内容をDBに記録 */
		const dao = new ReportReferrerDao();
		dao.insert(location, referrer);

		/* エラー内容を通知 */
		this.notice(req, location, referrer);

		res.status(204).end();
	}

	/**
	 * エラー内容を通知
	 *
	 * @param {Request} req - Request
	 * @param {string} location - ページ URL
	 * @param {string} referrer - リファラー
	 */
	private async notice(req: Request, location: string, referrer: string): Promise<void> {
		const html = await ejs.renderFile(`${this.#config.views}/${this.#config.referrer.mail.view}.ejs`, {
			location: location,
			referrer: referrer,
			ua: req.get('User-Agent') ?? null,
			ip: req.ip,
		});

		const transporter = nodemailer.createTransport({
			port: this.#config.mail.port,
			host: this.#config.mail.smtp,
			auth: {
				user: this.#config.mail.user,
				pass: this.#config.mail.password,
			},
		});

		await transporter.sendMail({
			from: this.#config.mail.from,
			to: this.#config.mail.to,
			subject: this.#config.referrer.mail.title,
			html: html,
		});
	}
}
