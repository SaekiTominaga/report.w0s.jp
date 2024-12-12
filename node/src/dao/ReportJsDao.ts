import ReportDao from './ReportDao.js';

/**
 * JavaScript エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * 同一ユーザーによるアクセスかつ同一エラー内容が既に記録されているかどうか
	 *
	 * @param data - 登録データ
	 * @param data.message - エラーメッセージ
	 * @param data.jsUrl - JS ファイルの URL
	 * @param data.lineno - 発生箇所の行数
	 * @param data.colno - 発生箇所の列数
	 * @param data.ua - UA 文字列
	 * @param data.ip - IP アドレス
	 *
	 * @returns 既に記録されていれば true
	 */
	async same(data: { message: string; jsUrl: string; lineno: number; colno: number; ua: string | undefined; ip: string }): Promise<boolean> {
		interface Select {
			count: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(insert_date) AS count
			FROM
				d_js
			WHERE
				message = :message AND
				js_url = :js_url AND
				lineno = :lineno AND
				colno = :colno AND
				ua = :ua AND
				ip = :ip
		`);
		await sth.bind({
			':message': data.message,
			':js_url': data.jsUrl,
			':lineno': data.lineno,
			':colno': data.colno,
			':ua': data.ua ?? null,
			':ip': data.ip,
		});
		const row: Select | undefined = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return false;
		}

		return row.count >= 1;
	}

	/**
	 * エラー内容を DB に登録
	 *
	 * @param data - 登録データ
	 * @param data.pageUrl - ページ URL
	 * @param data.message - エラーメッセージ
	 * @param data.jsUrl - JS ファイルの URL
	 * @param data.lineno - 発生箇所の行数
	 * @param data.colno - 発生箇所の列数
	 * @param data.ua - UA 文字列
	 * @param data.ip - IP アドレス
	 *
	 * @returns 登録が行われれば true
	 */
	async insert(data: { pageUrl: string; message: string; jsUrl: string; lineno: number; colno: number; ua: string | undefined; ip: string }): Promise<boolean> {
		if (
			await this.same({
				message: data.message,
				jsUrl: data.jsUrl,
				lineno: data.lineno,
				colno: data.colno,
				ua: data.ua,
				ip: data.ip,
			})
		) {
			/* 同一ユーザーによるアクセスかつ同一エラー内容が既に記録されていたら記録を行わない */
			return false;
		}

		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const insertDataSth = await dbh.prepare(`
				INSERT INTO
					d_js
					(page_url, message, js_url, lineno, colno, ua, ip, insert_date)
				VALUES
					(:page_url, :message, :js_url, :lineno, :colno, :ua, :ip, :insert_date)
			`);
			await insertDataSth.run({
				':page_url': data.pageUrl,
				':message': data.message,
				':js_url': data.jsUrl,
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

		return true;
	}
}
