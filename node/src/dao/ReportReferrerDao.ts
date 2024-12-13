import ReportDao from './ReportDao.js';

/**
 * リファラーエラー
 */
export default class ReportReferrerDao extends ReportDao {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 * @param data.pageUrl - ページ URL
	 * @param data.referrer - リファラー
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: { pageUrl: string; referrer: string }): Promise<boolean> {
		interface Select {
			count: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(insert_date) AS count
			FROM
				d_referrer
			WHERE
				page_url = :page_url AND
				referrer = :referrer
		`);
		await sth.bind({
			':page_url': data.pageUrl,
			':referrer': data.referrer,
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
	 * @param data.referrer - リファラー
	 */
	async insert(data: { pageUrl: string; referrer: string }): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const insertDataSth = await dbh.prepare(`
				INSERT INTO
					d_referrer
					(page_url, referrer, insert_date)
				VALUES
					(:page_url, :referrer, :insert_date)
			`);
			await insertDataSth.run({
				':page_url': data.pageUrl,
				':referrer': data.referrer,
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
