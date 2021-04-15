import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import ReportJsDao from '../dao/ReportJsDao.js';
import { ReportW0SJp as Configure } from '../../configure/type/Report';
import { Request, Response } from 'express';

/**
 * JavaScript エラー
 */
export default class JsController extends Controller implements ControllerInterface {
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
		const message: string | undefined = requestBody.message;
		const filename: string | undefined = requestBody.filename;
		const lineno = requestBody.lineno !== undefined ? Number(requestBody.lineno) : undefined;
		const colno = requestBody.colno !== undefined ? Number(requestBody.colno) : undefined;

		if (location === undefined || message === undefined || filename === undefined || lineno === undefined || colno === undefined) {
			this.logger.error(
				`パラメーター location（${location}）, message（${message}）, filename（${filename}）, lineno（${lineno}）, colno（${colno}）のいずれかが未設定: ${req.get(
					'User-Agent'
				)}`
			);
			res.status(403).end();
			return;
		}

		/* エラー内容をDBに記録 */
		const dao = new ReportJsDao();
		dao.insert(req, location, message, filename, lineno, colno);

		/* エラー内容を通知 */
		this.notice(req, location, message, filename, lineno, colno);

		res.status(204).end();
	}

	/**
	 * エラー内容を通知
	 *
	 * @param {Request} req - Request
	 * @param {string} location - ページ URL
	 * @param {string} message - エラーメッセージ
	 * @param {string} filename - JS ファイルの URL
	 * @param {number} lineno - 発生箇所の行数
	 * @param {number} colno - 発生箇所の列数
	 */
	private async notice(req: Request, location: string, message: string, filename: string, lineno: number, colno: number): Promise<void> {
		const html = await ejs.renderFile(`${this.#config.views}/${this.#config.js.mail.view}.ejs`, {
			location: location,
			message: message,
			filename: filename,
			lineno: lineno,
			colno: colno,
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
			subject: this.#config.js.mail.title,
			html: html,
		});
	}
}
