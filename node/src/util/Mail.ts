import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from './env.js';

export default class Mail {
	readonly #transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

	constructor() {
		this.#transport = nodemailer.createTransport({
			port: env('MAIL_PORT', 'number'),
			host: env('MAIL_SMTP'),
			auth: {
				user: env('MAIL_USER'),
				pass: env('MAIL_PASSWORD'),
			},
		});
	}

	/**
	 * エラー内容を通知
	 *
	 * @param subject - メールタイトル
	 * @param html - メール本文の HTML
	 */
	async sendHtml(subject: string, html: string): Promise<void> {
		await this.#transport.sendMail({
			from: env('MAIL_FROM'),
			to: env('MAIL_TO'),
			subject: subject,
			html: html,
		});
	}
}
