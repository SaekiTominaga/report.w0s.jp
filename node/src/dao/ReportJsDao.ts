import { prepareSelect, prepareInsert } from '../util/sql.js';
import ReportDao from './ReportDao.js';

/**
 * JavaScript エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: Readonly<Omit<ReportDB.JS, 'registeredAt'>>): Promise<boolean> {
		interface Select {
			count: number;
		}

		const dbh = await this.getDbh();

		const { sqlWhere, bindParams } = prepareSelect({
			message: data.message,
			js_url: data.jsURL,
			line_number: data.lineNumber,
			column_number: data.columnNumber,
			ua: data.ua,
		});

		const sth = await dbh.prepare(`
			SELECT
				COUNT(registered_at) AS count
			FROM
				d_js
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
	async insert(data: Readonly<Omit<ReportDB.JS, 'registeredAt'>>): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');

		try {
			const { sqlInto, sqlValues, bindParams } = prepareInsert({
				document_url: data.documentURL,
				message: data.message,
				js_url: data.jsURL,
				line_number: data.lineNumber,
				column_number: data.columnNumber,
				ua: data.ua,
				registered_at: new Date(),
			});

			const sth = await dbh.prepare(`
				INSERT INTO
					d_js
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
