import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';

/**
 * レポート共通
 */
export default class ReportDao {
	#dbh: sqlite.Database<sqlite3.Database, sqlite3.Statement> | null = null;

	/**
	 * DB 接続情報を取得する
	 *
	 * @returns {sqlite.Database} DB 接続情報
	 */
	protected async getDbh(): Promise<sqlite.Database<sqlite3.Database, sqlite3.Statement>> {
		if (this.#dbh !== null) {
			return this.#dbh;
		}

		const dbh = await sqlite.open({
			filename: '../db/report.db',
			driver: sqlite3.Database,
		});

		this.#dbh = dbh;

		return dbh;
	}
}
