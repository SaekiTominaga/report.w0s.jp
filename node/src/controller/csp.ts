import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import ip from 'ip';
import Log4js from 'log4js';
import ReportCspDao from '../dao/ReportCspDao.js';
import Mail from '../util/Mail.js';
import { header as headerValidator } from '../validator/csp.js';

interface ReportingApiV1Body {
	/* https://w3c.github.io/webappsec-csp/#reporting */
	documentURL: string;
	referrer?: string;
	blockedURL?: string;
	effectiveDirective: string;
	originalPolicy: string;
	sourceFile?: string;
	sample?: string;
	disposition: 'enforce' | 'report';
	statusCode: number;
	lineNumber?: number;
	columnNumber?: number;
}

interface ReportingApiV1 {
	/* https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_reporting */
	age: number;
	body: ReportingApiV1Body;
	type: string;
	url: string;
	user_agent: string;
}

interface ReportUri {
	/* https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation */
	'csp-report': {
		'document-uri': string; // 違反が発生したドキュメントの URI
		referrer?: string; // 違反が発生した文書の参照元
		'blocked-uri'?: string; // ブロックされたリソースの URI
		'effective-directive': string; // 違反が発生したディレクティブ
		'violated-directive': string; // `effective-directive` の旧名称
		'original-policy': string; // 元のポリシー
		disposition: 'enforce' | 'report';
		'status-code': number;
		'script-sample'?: string; // 違反の原因となったインラインスクリプト、イベントハンドラー、またはスタイルの最初の40文字
		'source-file'?: string;
		'line-number'?: number;
		'column-number'?: number;
	};
}

/**
 * CSP エラー
 */
const logger = Log4js.getLogger('csp');

const app = new Hono().post('/', headerValidator, async (context) => {
	const { req } = context;

	let reportingBody: ReportingApiV1Body;
	let ua: string | undefined;
	const ipAddress = ip.address();

	const { contentType } = req.valid('header');
	if (contentType === 'application/reports+json') {
		const { body, user_agent: userAgent } = await req.json<ReportingApiV1>();
		logger.debug(body);

		reportingBody = body;
		ua = userAgent;
	} else {
		const { 'csp-report': cspReport } = await req.json<ReportUri>();
		logger.debug(cspReport);

		reportingBody = {
			documentURL: cspReport['document-uri'],
			effectiveDirective: cspReport['effective-directive'],
			originalPolicy: cspReport['original-policy'],
			disposition: cspReport.disposition,
			statusCode: cspReport['status-code'],
		};
		if (cspReport.referrer !== undefined) {
			reportingBody.referrer = cspReport.referrer;
		}
		if (cspReport['blocked-uri'] !== undefined) {
			reportingBody.blockedURL = cspReport['blocked-uri'];
		}
		if (cspReport['source-file'] !== undefined) {
			reportingBody.sourceFile = cspReport['source-file'];
		}
		if (cspReport['script-sample'] !== undefined) {
			reportingBody.sample = cspReport['script-sample'];
		}
		if (cspReport['line-number'] !== undefined) {
			reportingBody.lineNumber = cspReport['line-number'];
		}
		if (cspReport['column-number'] !== undefined) {
			reportingBody.columnNumber = cspReport['column-number'];
		}

		ua = req.header('User-Agent');
	}

	const dbFilePath = process.env['SQLITE_REPORT'];
	if (dbFilePath === undefined) {
		throw new HTTPException(500, { message: 'DB file path not defined' });
	}

	const dao = new ReportCspDao(dbFilePath);

	const existSameData = await dao.same({
		documentURL: reportingBody.documentURL,
		referrer: reportingBody.referrer,
		blockedURL: reportingBody.blockedURL,
		effectiveDirective: reportingBody.effectiveDirective,
		originalPolicy: reportingBody.originalPolicy,
		sourceFile: reportingBody.sourceFile,
		sample: reportingBody.sample,
		disposition: reportingBody.disposition,
		statusCode: reportingBody.statusCode,
		lineNumber: reportingBody.lineNumber,
		columnNumber: reportingBody.columnNumber,
		ua: ua,
		ip: ipAddress,
	});

	/* DB に登録 */
	await dao.insert({
		documentURL: reportingBody.documentURL,
		referrer: reportingBody.referrer,
		blockedURL: reportingBody.blockedURL,
		effectiveDirective: reportingBody.effectiveDirective,
		originalPolicy: reportingBody.originalPolicy,
		sourceFile: reportingBody.sourceFile,
		sample: reportingBody.sample,
		disposition: reportingBody.disposition,
		statusCode: reportingBody.statusCode,
		lineNumber: reportingBody.lineNumber,
		columnNumber: reportingBody.columnNumber,
		ua: ua,
		ip: ipAddress,
	});

	if (!existSameData) {
		/* メール通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/csp_mail.ejs`, {
			documentURL: reportingBody.documentURL,
			referrer: reportingBody.referrer,
			blockedURL: reportingBody.blockedURL,
			effectiveDirective: reportingBody.effectiveDirective,
			originalPolicy: reportingBody.originalPolicy,
			sourceFile: reportingBody.sourceFile,
			sample: reportingBody.sample,
			disposition: reportingBody.disposition,
			statusCode: reportingBody.statusCode,
			lineNumber: reportingBody.lineNumber,
			columnNumber: reportingBody.columnNumber,
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
