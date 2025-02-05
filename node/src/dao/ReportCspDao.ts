import { prepareInsert } from '../util/sql.js';
import ReportDao from './ReportDao.js';

/**
 * CSP エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * エラー内容を DB に登録
	 *
	 * @param datas - 登録データ
	 */
	async insert(datas: Readonly<Omit<ReportDB.CSP, 'registeredAt'>>[]): Promise<void> {
		if (datas.length === 0) {
			return;
		}

		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			await Promise.all(
				datas.map(async (data) => {
					const { sqlInto, sqlValues, bindParams } = prepareInsert({
						document_url: data.documentURL,
						referrer: data.referrer,
						blocked_url: data.blockedURL,
						effective_directive: data.effectiveDirective,
						original_policy: data.originalPolicy,
						disposition: data.disposition,
						status_code: data.statusCode,
						sample: data.sample,
						source_file: data.sourceFile,
						line_number: data.lineNumber,
						column_number: data.columnNumber,
						ua: data.ua,
						registered_at: new Date(),
					});

					const sth = await dbh.prepare(`
						INSERT INTO
							d_csp
							${sqlInto}
						VALUES
							${sqlValues}
					`);
					await sth.run(bindParams);
					await sth.finalize();
				}),
			);

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
