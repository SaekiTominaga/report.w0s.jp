import ejs from 'ejs';
import { Hono, type HonoRequest } from 'hono';
import { HTTPException } from 'hono/http-exception';
import ip from 'ip';
import Log4js from 'log4js';
import ReportCspDao from '../dao/ReportCspDao.js';
import Mail from '../util/Mail.js';
import { header as headerValidator, type ContentType } from '../validator/csp.js';

interface ReportingApiV1Body {
	/* https://w3c.github.io/webappsec-csp/#reporting */
	documentURL: string; // 違反が発生したドキュメントの URL
	referrer?: string; // 違反が発生した文書の参照元
	blockedURL?: string; // ブロックされたリソースの URL
	effectiveDirective: string; // 違反が発生したディレクティブ
	originalPolicy: string; // 元のポリシー
	sourceFile?: string;
	sample?: string; // 違反の原因となったインラインスクリプト、イベントハンドラー、またはスタイルの最初の40文字
	disposition: 'enforce' | 'report';
	statusCode: number;
	lineNumber?: number;
	columnNumber?: number;
}

interface ReportingApiV1 {
	/* https://w3c.github.io/reporting/#serialize-reports */
	age: number; // レポートのタイムスタンプと現在時刻の間のミリ秒数
	type: string; // CSP の場合は `csp-violation`
	url: string;
	user_agent: string | undefined; // undefined は `report-uri` ディレクティブの互換性確保のために必要
	body: ReportingApiV1Body;
}

interface ReportUri {
	/* https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation */
	'csp-report': {
		'document-uri': string; // 違反が発生したドキュメントの URL
		referrer?: string; // 違反が発生した文書の参照元
		'blocked-uri'?: string; // ブロックされたリソースの URL
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

const getReporting = async (
	req: HonoRequest,
	option: Readonly<{
		contentType: ContentType;
	}>,
): Promise<ReportingApiV1[]> => {
	if (option.contentType === 'application/csp-report') {
		const json = await req.json<ReportUri>();
		logger.debug('report-uri', option.contentType, json);
		const { 'csp-report': cspReport } = json;

		const reportingBody: ReportingApiV1Body = {
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

		return [
			{
				age: -1,
				body: reportingBody,
				type: 'csp-violation',
				url: reportingBody.documentURL,
				user_agent: req.header('User-Agent'),
			},
		];
	}

	const json = await req.json<ReportingApiV1[]>();
	logger.debug('Reporting Api v1', option.contentType, json);
	return json;
};

const app = new Hono().post('/', headerValidator, async (context) => {
	const { req } = context;

	const { contentType } = req.valid('header');

	const reportings = await getReporting(req, {
		contentType: contentType,
	});
	const ipAddress = ip.address();

	const dbFilePath = process.env['SQLITE_REPORT'];
	if (dbFilePath === undefined) {
		throw new HTTPException(500, { message: 'DB file path not defined' });
	}

	const dao = new ReportCspDao(dbFilePath);

	const noticeList = (
		await Promise.all(
			reportings.map(async (reporting) => {
				const { body, user_agent: userAgent } = reporting;

				const existSameData = await dao.same({
					documentURL: body.documentURL,
					referrer: body.referrer,
					blockedURL: body.blockedURL,
					effectiveDirective: body.effectiveDirective,
					originalPolicy: body.originalPolicy,
					sourceFile: body.sourceFile,
					sample: body.sample,
					disposition: body.disposition,
					statusCode: body.statusCode,
					lineNumber: body.lineNumber,
					columnNumber: body.columnNumber,
					ua: userAgent,
					ip: ipAddress,
				});

				return !existSameData ? reporting : undefined;
			}),
		)
	).filter((notice) => notice !== undefined);

	const insertList: Readonly<Omit<ReportDB.CSP, 'registeredAt'>>[] = reportings.map((reporting) => {
		const { body, user_agent: userAgent } = reporting;

		return {
			documentURL: body.documentURL,
			referrer: body.referrer,
			blockedURL: body.blockedURL,
			effectiveDirective: body.effectiveDirective,
			originalPolicy: body.originalPolicy,
			sourceFile: body.sourceFile,
			sample: body.sample,
			disposition: body.disposition,
			statusCode: body.statusCode,
			lineNumber: body.lineNumber,
			columnNumber: body.columnNumber,
			ua: userAgent,
			ip: ipAddress,
		};
	});

	/* DB に登録 */
	await dao.insert(insertList);

	if (noticeList.length >= 1) {
		/* メール通知 */
		const html = await ejs.renderFile(`${process.env['VIEWS'] ?? ''}/csp_mail.ejs`, {
			reportings: noticeList,
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
