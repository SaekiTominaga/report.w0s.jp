import { prepareWhere } from '../util/sql.js';
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

		const { sqlWhere, bindParams } = prepareWhere({
			message: data.message,
			js_url: data.jsURL,
			line_number: data.lineNumber,
			column_number: data.columnNumber,
			ua: data.ua,
		});

		const dbh = await this.getDbh();

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
			const sth = await dbh.prepare(`
				INSERT INTO
					d_js
					( document_url,  message,  js_url,  line_number,  column_number,  ua,  registered_at)
				VALUES
					(:document_url, :message, :js_url, :line_number, :column_number, :ua, :registered_at)
			`);
			await sth.run({
				':document_url': data.documentURL,
				':message': data.message,
				':js_url': data.jsURL,
				':line_number': data.lineNumber,
				':column_number': data.columnNumber,
				':ua': data.ua ?? null,
				':registered_at': Math.round(Date.now() / 1000),
			});
			await sth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
