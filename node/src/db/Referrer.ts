import { sql, type Insertable, type Selectable } from 'kysely';
import { jsToSQLite } from '@w0s/sqlite-utility';
import type { DReferrer } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * リファラーエラー
 */
export default class extends Database {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: Readonly<Omit<Selectable<DReferrer>, 'registered_at'>>): Promise<boolean> {
		let query = this.db.selectFrom('d_referrer').select([sql<number>`COUNT(registered_at)`.as('count')]);
		query = query.where('document_url', '=', jsToSQLite(data.document_url));
		query = query.where('referrer', '=', jsToSQLite(data.referrer));

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
	async insert(data: Readonly<Omit<Insertable<DReferrer>, 'registered_at'>>): Promise<void> {
		let query = this.db.insertInto('d_referrer');
		query = query.values({
			document_url: jsToSQLite(data.document_url),
			referrer: jsToSQLite(data.referrer),
			registered_at: jsToSQLite(new Date()),
		});

		await query.executeTakeFirst();
	}
}
