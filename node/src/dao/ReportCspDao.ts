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
