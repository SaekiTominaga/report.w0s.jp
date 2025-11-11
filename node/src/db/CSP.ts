import type { Insertable } from 'kysely';
import { jsToSQLite } from '@w0s/sqlite-utility';
import type { DCsp } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * CSP エラー
 */
export default class extends Database {
	/**
	 * エラー内容を DB に登録
	 *
	 * @param datas - 登録データ
	 */
	async insert(datas: Readonly<Omit<Insertable<DCsp>, 'registered_at'>>[]): Promise<void> {
		if (datas.length === 0) {
			return;
		}

		let query = this.db.insertInto('d_csp');
		query = query.values(
			datas.map((data) => ({
				document_url: jsToSQLite(data.document_url),
				referrer: jsToSQLite(data.referrer),
				blocked_url: jsToSQLite(data.blocked_url),
				effective_directive: jsToSQLite(data.effective_directive),
				original_policy: jsToSQLite(data.original_policy),
				disposition: jsToSQLite(data.disposition),
				status_code: jsToSQLite(data.status_code),
				sample: jsToSQLite(data.sample),
				source_file: jsToSQLite(data.source_file),
				line_number: jsToSQLite(data.line_number),
				column_number: jsToSQLite(data.column_number),
				ua: jsToSQLite(data.ua),
				registered_at: jsToSQLite(new Date()),
			})),
		);

		await query.executeTakeFirst();
	}
}
