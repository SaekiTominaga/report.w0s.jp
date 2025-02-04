import { prepareWhere } from '../util/sql.js';
import ReportDao from './ReportDao.js';

/**
 * リファラーエラー
 */
export default class ReportReferrerDao extends ReportDao {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: Readonly<Omit<ReportDB.Referrer, 'registeredAt'>>): Promise<boolean> {
		interface Select {
			count: number;
		}

		const { sqlWhere, bindParams } = prepareWhere({
			document_url: data.documentURL,
			referrer: data.referrer,
		});

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(registered_at) AS count
			FROM
				d_referrer
			WHERE
				${sqlWhere}
		`);
		await sth.bind(bindParams);

		const row = await sth.get<Select>();
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
	 */
	async insert(data: Readonly<Omit<ReportDB.Referrer, 'registeredAt'>>): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const insertDataSth = await dbh.prepare(`
				INSERT INTO
					d_referrer
					( document_url,  referrer,  registered_at)
				VALUES
					(:document_url, :referrer, :registered_at)
			`);
			await insertDataSth.run({
				':document_url': data.documentURL,
				':referrer': data.referrer,
				':registered_at': Math.round(Date.now() / 1000),
			});
			await insertDataSth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
