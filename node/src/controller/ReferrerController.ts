import fs from 'node:fs';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import type { Request, Response } from 'express';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import ReportReferrerDao from '../dao/ReportReferrerDao.js';
import type { NoName as Configure } from '../../../configure/type/referrer.js';
import type { ReportW0SJp as ConfigureCommon } from '../../../configure/type/common.js';

/**
 * リファラーエラー
 */
export default class ReferrerController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;

	#config: Configure;

	/**
	 * @param configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = JSON.parse(fs.readFileSync('configure/referrer.json', 'utf8'));
	}

	/**
	 * @param req - Request
	 * @param res - Response
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
		const location = requestBody.location !== undefined ? String(requestBody.location) : undefined;
		const referrer = requestBody.referrer !== undefined ? String(requestBody.referrer) : undefined;

		if (location === undefined || referrer === undefined) {
			this.logger.error(`パラメーター location（${location}）, referrer${referrer}）のいずれかが未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		/* エラー内容をDBに記録 */
		const dao = new ReportReferrerDao(this.#configCommon.sqlite.db['report']);
		await dao.insert(location, referrer);

		/* エラー内容を通知 */
		await this.#notice(req, location, referrer);

		res.status(204).end();
	}

	/**
	 * エラー内容を通知
	 *
	 * @param req - Request
	 * @param location - ページ URL
	 * @param referrer - リファラー
	 */
	async #notice(req: Request, location: string, referrer: string): Promise<void> {
		const html = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.mail.view}.ejs`, {
			location: location,
			referrer: referrer,
			ua: req.get('User-Agent') ?? null,
			ip: req.ip,
		});

		const transporter = nodemailer.createTransport({
			port: this.#configCommon.mail.port,
			host: this.#configCommon.mail.smtp,
			auth: {
				user: this.#configCommon.mail.user,
				pass: this.#configCommon.mail.password,
			},
		});

		await transporter.sendMail({
			from: this.#configCommon.mail.from,
			to: this.#configCommon.mail.to,
			subject: this.#config.mail.title,
			html: html,
		});
	}
}
