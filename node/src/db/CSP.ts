import type { Insertable } from 'kysely';
import { jsToSQLiteAssignment } from '@w0s/sqlite-utility';
import type { DCsp } from '../../../@types/db_report.d.ts';
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
	async insert(datas: readonly Readonly<Omit<Insertable<DCsp>, 'registered_at'>>[]): Promise<void> {
		if (datas.length === 0) {
			return;
		}

		let query = this.db.insertInto('d_csp');
		query = query.values(
			datas.map((data) => ({
				document_url: jsToSQLiteAssignment(data.document_url),
				referrer: jsToSQLiteAssignment(data.referrer),
				blocked_url: jsToSQLiteAssignment(data.blocked_url),
				effective_directive: jsToSQLiteAssignment(data.effective_directive),
				original_policy: jsToSQLiteAssignment(data.original_policy),
				disposition: jsToSQLiteAssignment(data.disposition),
				status_code: jsToSQLiteAssignment(data.status_code),
				sample: jsToSQLiteAssignment(data.sample),
				source_file: jsToSQLiteAssignment(data.source_file),
				line_number: jsToSQLiteAssignment(data.line_number),
				column_number: jsToSQLiteAssignment(data.column_number),
				ua: jsToSQLiteAssignment(data.ua),
				registered_at: jsToSQLiteAssignment(new Date()),
			})),
		);

		await query.executeTakeFirst();
	}
}
