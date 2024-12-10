import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export default class Mail {
	readonly #transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

	constructor() {
		this.#transport = nodemailer.createTransport({
			port: Number(process.env['MAIL_PORT']),
			host: process.env['MAIL_SMTP'],
			auth: {
				user: process.env['MAIL_USER'],
				pass: process.env['MAIL_PASSWORD'],
			},
		});
	}

	/**
	 * エラー内容を通知
	 *
	 * @param subject - メールタイトル
	 * @param html - メール本文の HTML
	 */
	async sendHtml(subject: string | undefined, html: string): Promise<void> {
		await this.#transport.sendMail({
			from: process.env['MAIL_FROM'],
			to: process.env['MAIL_TO'],
			subject: subject,
			html: html,
		});
	}
}
