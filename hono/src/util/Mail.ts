import { type Transporter, createTransport } from 'nodemailer';
import { env } from '@w0s/env-value-type';

export default class Mail {
	readonly #transport: Transporter;

	constructor() {
		this.#transport = createTransport({
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
			to: env('NOTICE_MAIL_TO'),
			subject: subject,
			html: html,
		});
	}
}
