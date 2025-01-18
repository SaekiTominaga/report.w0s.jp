import { prepareWhereEqual } from '../util/sql.js';
import ReportDao from './ReportDao.js';

/**
 * CSP エラー
 */
export default class ReportJsDao extends ReportDao {
	/**
	 * 同一内容のエラーが既に登録されているかどうか
	 *
	 * @param data - 登録データ
	 *
	 * @returns 既に登録されていれば true
	 */
	async same(data: Readonly<Omit<ReportDB.CSP, 'registeredAt'>>): Promise<boolean> {
		interface Select {
			count: number;
		}

		const { sqlWhere, bind } = prepareWhereEqual({
			document_url: data.documentURL,
			referrer: data.referrer,
			blocked_url: data.blockedURL,
			effective_directive: data.effectiveDirective,
			original_policy: data.originalPolicy,
			source_file: data.sourceFile,
			sample: data.sample,
			disposition: data.disposition,
			status_code: data.statusCode,
			line_number: data.lineNumber,
			column_number: data.columnNumber,
			ua: data.ua,
		});

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(registered_at) AS count
			FROM
				d_csp
			WHERE
				${sqlWhere}
		`);
		await sth.bind(bind);

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
					const sth = await dbh.prepare(`
						INSERT INTO
							d_csp
							( document_url,  referrer,  blocked_url,  effective_directive,  original_policy,  source_file,  sample,  disposition,  status_code,  line_number,  column_number,  ua,  registered_at)
						VALUES
							(:document_url, :referrer, :blocked_url, :effective_directive, :original_policy, :source_file, :sample, :disposition, :status_code, :line_number, :column_number, :ua, :registered_at)
					`);
					await sth.run({
						':document_url': data.documentURL,
						':referrer': data.referrer,
						':blocked_url': data.blockedURL,
						':effective_directive': data.effectiveDirective,
						':original_policy': data.originalPolicy,
						':disposition': data.disposition,
						':status_code': data.statusCode,
						':sample': data.sample ?? null,
						':source_file': data.sourceFile ?? null,
						':line_number': data.lineNumber ?? null,
						':column_number': data.columnNumber ?? null,
						':ua': data.ua ?? null,
						':registered_at': Math.round(Date.now() / 1000),
					});
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
