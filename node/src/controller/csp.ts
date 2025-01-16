import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import ip from 'ip';
import Log4js from 'log4js';
import ReportCspDao from '../dao/ReportCspDao.js';
import { cors as corsMiddleware } from '../middleware/cors.js';
import Mail from '../util/Mail.js';
import { header as headerValidator } from '../validator/csp.js';

interface CSPReport {
	/* https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation */
	'csp-report': {
		'document-uri': string; // 違反が発生したドキュメントの URI
		referrer: string; // 違反が発生した文書の参照元
		'blocked-uri': string; // ブロックされたリソースの URI
		'effective-directive': string; // 違反が発生したディレクティブ
		'violated-directive': string; // `effective-directive` の旧名称
		'original-policy': string; // 元のポリシー
		disposition: string; // `enforce` or `report`
		'status-code': number;
		sample?: string; // 違反の原因となったインラインスクリプト、イベントハンドラー、またはスタイルの最初の40文字（仕様上は `blocked-uri` が `inline` 以外は空の値になるはずだが、実際はキー自体が送信されない）
		'script-sample'?: string; // `sample` の `report-uri` における名称
		'source-file'?: string;
		'line-number'?: number;
		'column-number'?: number;
	};
}

/**
 * CSP エラー
 */
const logger = Log4js.getLogger('csp');

const app = new Hono().post('/', corsMiddleware).post('/', headerValidator, async (context) => {
	const { req } = context;

	const { 'csp-report': cspReport } = await req.json<CSPReport>();
	if (cspReport.sample === undefined && cspReport['script-sample'] !== undefined) {
		/* 古い挙動を最新仕様に合わせる */
		cspReport.sample = cspReport['script-sample'];
	}
	logger.debug(cspReport);

	const ua = req.header('User-Agent');
	const ipAddress = ip.address();

	const dbFilePath = process.env['SQLITE_REPORT'];
	if (dbFilePath === undefined) {
		throw new HTTPException(500, { message: 'DB file path not defined' });
	}

	const dao = new ReportCspDao(dbFilePath);

	const existSameData = await dao.same({
		documentUri: cspReport['document-uri'],
		referrer: cspReport.referrer,
		blockedUri: cspReport['blocked-uri'],
		effectiveDirective: cspReport['effective-directive'],
		originalPolicy: cspReport['original-policy'],
		disposition: cspReport.disposition,
		statusCode: cspReport['status-code'],
		sample: cspReport.sample,
		sourceFile: cspReport['source-file'],
		lineNumber: cspReport['line-number'],
		columnNumber: cspReport['column-number'],
		ua: ua,
		ip: ipAddress,
	});

	/* DB に登録 */
	await dao.insert({
		documentUri: cspReport['document-uri'],
		referrer: cspReport.referrer,
		blockedUri: cspReport['blocked-uri'],
		effectiveDirective: cspReport['effective-directive'],
		originalPolicy: cspReport['original-policy'],
		disposition: cspReport.disposition,
		statusCode: cspReport['status-code'],
		sample: cspReport.sample,
		sourceFile: cspReport['source-file'],
		lineNumber: cspReport['line-number'],
		columnNumber: cspReport['column-number'],
		ua: ua,
		ip: ipAddress,
	});

	if (!existSameData) {
		/* メール通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/csp_mail.ejs`, {
			documentUri: cspReport['document-uri'],
			referrer: cspReport.referrer,
			blockedUri: cspReport['blocked-uri'],
			effectiveDirective: cspReport['effective-directive'],
			originalPolicy: cspReport['original-policy'],
			disposition: cspReport.disposition,
			statusCode: cspReport['status-code'],
			sample: cspReport.sample,
			sourceFile: cspReport['source-file'],
			lineNumber: cspReport['line-number'],
			columnNumber: cspReport['column-number'],
			ua: ua,
			ip: ipAddress,
		});

		await new Mail().sendHtml(process.env['CSP_MAIL_TITLE'], html);
	} else {
		logger.info('重複データにつきメール通知スルー');
	}

	return new Response(null, {
		status: 204,
	});
});

export default app;
