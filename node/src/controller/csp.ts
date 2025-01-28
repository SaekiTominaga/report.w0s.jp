import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import Log4js from 'log4js';
import configCsp from '../config/csp.js';
import ReportCspDao from '../dao/ReportCspDao.js';
import { env } from '../util/env.js';
import Mail from '../util/Mail.js';
import { header as headerValidator, type ContentType } from '../validator/csp.js';

interface CSPViolationReportBody {
	/* https://www.w3.org/TR/2024/WD-CSP3-20241217/#reporting */
	documentURL: string; // 違反が発生したドキュメントの URL
	referrer?: string; // 違反が発生した文書の参照元
	blockedURL?: string; // ブロックされたリソースの URL
	effectiveDirective: string; // 違反が発生したディレクティブ
	originalPolicy: string; // 元のポリシー
	sourceFile?: string;
	sample?: string; // 違反の原因となったインラインスクリプト、イベントハンドラー、またはスタイルの最初の40文字
	disposition: 'enforce' | 'report' | undefined; // undefined は Firefox, Safari の互換性確保のために必要
	statusCode: number;
	lineNumber?: number;
	columnNumber?: number;
}

interface ReportingApiV1 {
	/* https://www.w3.org/TR/2024/WD-reporting-1-20240813/#serialize-reports */
	age: number; // レポートのタイムスタンプと現在時刻の間のミリ秒数
	type: string; // CSP の場合は `csp-violation`
	url: string;
	user_agent: string | undefined; // undefined は `report-uri` ディレクティブの互換性確保のために必要
	body: Record<string, unknown>;
}

interface ReportingApiV1CSP {
	age: number; // レポートのタイムスタンプと現在時刻の間のミリ秒数
	type: `csp-violation`;
	url: string;
	user_agent: string | undefined; // undefined は `report-uri` ディレクティブの互換性確保のために必要
	body: CSPViolationReportBody;
}

interface ReportingApiSafari {
	/* Safari 18.2; https://www.w3.org/TR/2018/WD-reporting-1-20180925/#interface-reporting-observer */
	type: `csp-violation`;
	url: string;
	body: CSPViolationReportBody;
}

interface ReportUri {
	/* Firefox 136; https://www.w3.org/TR/2024/WD-CSP3-20241217/#deprecated-serialize-violation */
	'csp-report': {
		'document-uri': string; // 違反が発生したドキュメントの URL
		referrer?: string; // 違反が発生した文書の参照元
		'blocked-uri'?: string; // ブロックされたリソースの URL
		'effective-directive': string; // 違反が発生したディレクティブ
		'violated-directive': string; // `effective-directive` の旧名称
		'original-policy': string; // 元のポリシー
		disposition?: 'enforce' | 'report';
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

export const parseRequestJson = (
	requestJson: ReportingApiV1[] | ReportingApiSafari | ReportUri,
	headers: {
		contentType: ContentType;
		ua: string | undefined;
	},
): ReportingApiV1CSP[] => {
	if (Array.isArray(requestJson)) {
		/* Chrome */
		logger.debug(headers.contentType, requestJson);
		return requestJson.filter((data) => data.type === 'csp-violation') as unknown[] as ReportingApiV1CSP[];
	}

	logger.debug(headers.contentType, headers.ua, requestJson);

	if (!('csp-report' in requestJson)) {
		/* Safari 18.2 */
		return [
			{
				age: -1,
				type: requestJson.type,
				url: requestJson.url,
				user_agent: headers.ua,
				body: requestJson.body,
			},
		];
	}

	/* Firefox 136 */
	const { 'csp-report': cspReport } = requestJson;

	const reportingBody: CSPViolationReportBody = {
		documentURL: cspReport['document-uri'],
		effectiveDirective: cspReport['effective-directive'],
		originalPolicy: cspReport['original-policy'],
		disposition: cspReport.disposition ?? undefined,
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
			user_agent: headers.ua,
		},
	];
};

export const cors = (reportings: ReportingApiV1CSP[], allowOrigins: string[]): boolean =>
	reportings.some(({ body }) => {
		const url = URL.parse(body.documentURL);
		if (url === null) {
			return false;
		}

		return allowOrigins.includes(url.origin);
	});

export const narrowBody = (reportings: ReportingApiV1CSP[]): ReportingApiV1CSP[] =>
	reportings.filter(({ body }) => {
		/* effectiveDirective */
		if (body.blockedURL === undefined) {
			if (
				configCsp.narrowBody.disallowEffectives.find(
					([effectiveDirective, blockedPath]) => effectiveDirective === body.effectiveDirective && blockedPath === undefined,
				)
			) {
				return false;
			}
		} else {
			const blockedURL = URL.parse(body.blockedURL);
			if (blockedURL === null) {
				return false;
			}

			if (
				configCsp.narrowBody.disallowEffectives.find(([effectiveDirective, blockedPath]) => {
					if (blockedPath === undefined) {
						return effectiveDirective === body.effectiveDirective;
					}

					return effectiveDirective === body.effectiveDirective && blockedPath === `${blockedURL.origin}${blockedURL.pathname}`;
				})
			) {
				return false;
			}
		}

		return true;
	});

const app = new Hono().post('/', headerValidator, async (context) => {
	const { req } = context;

	const { contentType } = req.valid('header');
	const requestJson = await req.json<ReportingApiV1[] | ReportingApiSafari | ReportUri>();

	const reportingList = parseRequestJson(requestJson, {
		contentType: contentType,
		ua: req.header('User-Agent'),
	});

	/* 自ドメイン以外のデータを弾く（実質的な CORS の代替処理） */
	if (!cors(reportingList, env('CSP_ALLOW_ORIGINS', 'string[]'))) {
		throw new HTTPException(403, { message: 'The violation’s url is not an allowed origin' });
	}

	/* DB に登録 */
	const dao = new ReportCspDao(env('SQLITE_REPORT'));

	const dbInsertList: Readonly<Omit<ReportDB.CSP, 'registeredAt'>>[] = reportingList.map((reporting) => {
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
		};
	});

	await dao.insert(dbInsertList);

	/* 既知のエラーは通知除外する */
	const noticeList = narrowBody(reportingList);
	if (noticeList.length >= 1) {
		/* メール通知 */
		const html = await ejs.renderFile(`${env('VIEWS')}/csp_mail.ejs`, {
			reportings: noticeList,
		});

		await new Mail().sendHtml(env('CSP_MAIL_TITLE'), html);
	}

	return new Response(null, {
		status: 204,
	});
});

export default app;
