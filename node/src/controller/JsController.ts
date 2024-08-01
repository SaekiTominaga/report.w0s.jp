import fs from 'node:fs';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import type { Request, Response } from 'express';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import ReportJsDao from '../dao/ReportJsDao.js';
import type { JavaScript as Configure } from '../../../configure/type/js.js';
import type { ReportW0SJp as ConfigureCommon } from '../../../configure/type/common.js';

/**
 * JavaScript エラー
 */
export default class JsController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;

	#config: Configure;

	/**
	 * @param configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = JSON.parse(fs.readFileSync('configure/js.json', 'utf8')) as Configure;
	}

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
		const dao = new ReportJsDao(this.#configCommon.sqlite.db.report);
		await dao.insert(req, location, message, filename, lineno, colno);

		/* エラー内容を通知 */
		await this.#notice(req, location, message, filename, lineno, colno);

		res.status(204).end();
	}

	/**
	 * エラー内容を通知
	 *
	 * @param req - Request
	 * @param location - ページ URL
	 * @param message - エラーメッセージ
	 * @param filename - JS ファイルの URL
	 * @param lineno - 発生箇所の行数
	 * @param colno - 発生箇所の列数
	 */
	async #notice(req: Request, location: string, message: string, filename: string, lineno: number, colno: number): Promise<void> {
		const html = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.mail.view}.ejs`, {
			location: location,
			message: message,
			filename: filename,
			lineno: lineno,
			colno: colno,
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
