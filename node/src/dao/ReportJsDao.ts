import ReportDao from './ReportDao.js';
import { Request } from 'express';

/**
 * JavaScript エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * JavaScript エラー内容を DB に記録
	 *
	 * @param {Request} req - Request
	 * @param {string} location - ページ URL
	 * @param {string} message - エラーメッセージ
	 * @param {string} filename - JS ファイルの URL
	 * @param {number} lineno - 発生箇所の行数
	 * @param {number} colno - 発生箇所の列数
	 */
	public async insert(req: Request, location: string, message: string, filename: string, lineno: number, colno: number): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const insertDataSth = await dbh.prepare(`
				INSERT INTO
					d_js
					(page_url, message, js_url, lineno, colno, ua, ip, insert_date)
				VALUES
					(:location, :message, :filename, :lineno, :colno, :ua, :ip, :insert_date)
			`);
			await insertDataSth.run({
				':location': location,
				':message': message,
				':filename': filename,
				':lineno': lineno,
				':colno': colno,
				':ua': req.get('User-Agent') ?? null,
				':ip': req.ip,
				':insert_date': Math.round(Date.now() / 1000),
			});
			await insertDataSth.finalize();

			dbh.exec('COMMIT');
		} catch (e) {
			dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
