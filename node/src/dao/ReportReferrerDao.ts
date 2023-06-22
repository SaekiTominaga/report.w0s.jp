import ReportDao from './ReportDao.js';

/**
 * リファラーエラー
 */
export default class ReportReferrerDao extends ReportDao {
	/**
	 * リファラーエラー内容を DB に記録
	 *
	 * @param {string} location - ページ URL
	 * @param {string} referrer - リファラー
	 */
	async insert(location: string, referrer: string): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const insertDataSth = await dbh.prepare(`
				INSERT INTO
					d_referrer
					(page_url, referrer, insert_date)
				VALUES
					(:location, :referrer, :insert_date)
			`);
			await insertDataSth.run({
				':location': location,
				':referrer': referrer,
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
