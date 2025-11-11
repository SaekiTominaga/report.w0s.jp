import { sql, type Insertable, type Selectable } from 'kysely';
import { jsToSQLite } from '@w0s/sqlite-utility';
import type { DJs } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * JavaScript エラー
 */
export default class extends Database {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: Readonly<Omit<Selectable<DJs>, 'registered_at'>>): Promise<boolean> {
		let query = this.db.selectFrom('d_js').select([sql<number>`COUNT(registered_at)`.as('count')]);
		query = query.where('message', '=', jsToSQLite(data.message));
		query = query.where('js_url', '=', jsToSQLite(data.js_url));
		query = query.where('line_number', '=', jsToSQLite(data.line_number));
		query = query.where('column_number', '=', jsToSQLite(data.column_number));
		query = query.where('ua', '=', jsToSQLite(data.ua));

		const row = await query.executeTakeFirst();
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
	async insert(data: Readonly<Omit<Insertable<DJs>, 'registered_at'>>): Promise<void> {
		let query = this.db.insertInto('d_js');
		query = query.values({
			document_url: jsToSQLite(data.document_url),
			message: jsToSQLite(data.message),
			js_url: jsToSQLite(data.js_url),
			line_number: jsToSQLite(data.line_number),
			column_number: jsToSQLite(data.column_number),
			ua: jsToSQLite(data.ua),
			registered_at: jsToSQLite(new Date()),
		});

		await query.executeTakeFirst();
	}
}
