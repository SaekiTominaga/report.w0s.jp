import ReportDao from './ReportDao.js';

/**
 * JavaScript エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * エラー内容を DB に記録
	 *
	 * @param data - 登録データ
	 * @param data.location - ページ URL
	 * @param data.message - エラーメッセージ
	 * @param data.filename - JS ファイルの URL
	 * @param data.lineno - 発生箇所の行数
	 * @param data.colno - 発生箇所の列数
	 * @param data.ua - UA 文字列
	 * @param data.ip - IP アドレス
	 */
	async insert(data: {
		location: string;
		message: string;
		filename: string;
		lineno: number;
		colno: number;
		ua: string | undefined;
		ip: string;
	}): Promise<void> {
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
				':location': data.location,
				':message': data.message,
				':filename': data.filename,
				':lineno': data.lineno,
				':colno': data.colno,
				':ua': data.ua ?? null,
				':ip': data.ip,
				':insert_date': Math.round(Date.now() / 1000),
			});
			await insertDataSth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
