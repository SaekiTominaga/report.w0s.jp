import { prepareSelect, prepareInsert } from '@w0s/sqlite-utility';
import ReportDao from './ReportDao.ts';

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

		const dbh = await this.getDbh();

		const { sqlWhere, bindParams } = prepareSelect({
			document_url: data.documentURL,
			referrer: data.referrer,
		});

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
			const { sqlInto, sqlValues, bindParams } = prepareInsert({
				document_url: data.documentURL,
				referrer: data.referrer,
				registered_at: new Date(),
			});

			const sth = await dbh.prepare(`
				INSERT INTO
					d_referrer
					${sqlInto}
				VALUES
					${sqlValues}
			`);
			await sth.run(bindParams);
			await sth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
