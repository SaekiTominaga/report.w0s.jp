import { SqliteError } from 'better-sqlite3';
import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configCsp from '../config/csp.ts';
import ReportCspDao from '../db/CSP.ts';
import Mail from '../util/Mail.ts';
import { header as headerValidator, type ContentType } from '../validator/csp.ts';
import type { DCsp } from '../../../@types/db_report.d.ts';

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
	statusCode: number | undefined; // undefined は古い Firefox のために必要
	lineNumber?: number;
	columnNumber?: number;
}

interface ReportingApiV1 {
	/* https://www.w3.org/TR/2024/WD-reporting-1-20240813/#serialize-reports */
	age: number; // レポートのタイムスタンプと現在時刻の間のミリ秒数
	type: string; // CSP の場合は `csp-violation`
	url: string;
	user_agent: string | undefined; // undefined は `report-uri` ディレクティブの互換性確保のために必要
	body: Readonly<Record<string, unknown>>;
}

interface ReportingApiV1CSP {
	age: number; // レポートのタイムスタンプと現在時刻の間のミリ秒数
	type: `csp-violation`;
	url: string;
	user_agent: string | undefined; // undefined は `report-uri` ディレクティブの互換性確保のために必要
	body: Readonly<CSPViolationReportBody>;
}

interface ReportingApiSafari {
	/* Safari 18.2; https://www.w3.org/TR/2018/WD-reporting-1-20180925/#interface-reporting-observer */
	type: `csp-violation`;
	url: string;
	body: Readonly<CSPViolationReportBody>;
}

interface ReportUri {
	/* Firefox 136; https://www.w3.org/TR/2024/WD-CSP3-20241217/#deprecated-serialize-violation */
	'csp-report': Readonly<{
		'document-uri': string; // 違反が発生したドキュメントの URL
		referrer?: string; // 違反が発生した文書の参照元
		'blocked-uri'?: string; // ブロックされたリソースの URL
		'effective-directive'?: string; // 違反が発生したディレクティブ
		'violated-directive': string; // `effective-directive` の旧名称
		'original-policy': string; // 元のポリシー
		disposition?: 'enforce' | 'report';
		'status-code'?: number; // 古い Firefox は送られない
		'script-sample'?: string; // 違反の原因となったインラインスクリプト、イベントハンドラー、またはスタイルの最初の40文字
		'source-file'?: string;
		'line-number'?: number;
		'column-number'?: number;
	}>;
}

/**
 * CSP エラー
 */
const logger = Log4js.getLogger('csp');

const isReportingApiArray = (
	arg: readonly Readonly<ReportingApiV1>[] | Readonly<ReportingApiSafari> | Readonly<ReportUri>,
): arg is readonly Readonly<ReportingApiV1>[] => Array.isArray(arg);

export const parseRequestJson = (
	requestJson: readonly Readonly<ReportingApiV1>[] | Readonly<ReportingApiSafari> | Readonly<ReportUri>,
	headers: Readonly<{
		contentType: ContentType;
		ua: string | undefined;
	}>,
): ReportingApiV1CSP[] => {
	if (isReportingApiArray(requestJson)) {
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
		effectiveDirective: cspReport['effective-directive'] ?? cspReport['violated-directive'], // 古い Firefox は violated-directive のみ
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

export const cors = (reportings: readonly Readonly<ReportingApiV1CSP>[], allowOrigins: readonly string[]): boolean =>
	reportings.some(({ body }) => {
		const url = URL.parse(body.documentURL);
		if (url === null) {
			return false;
		}

		return allowOrigins.includes(url.origin);
	});

export const noticeFilter = (reportingList: readonly Readonly<ReportingApiV1CSP>[]): ReportingApiV1CSP[] =>
	reportingList.filter(
		({ body }) =>
			!configCsp.noticeFilter.some(({ blockedURL, effectiveDirective, sourceFile, sample }) => {
				/* return true: 除去対象 */
				if (blockedURL !== undefined && body.blockedURL !== undefined) {
					if (typeof blockedURL === 'string') {
						if (blockedURL !== body.blockedURL) {
							return false;
						}
					} else if (!blockedURL.test(body.blockedURL)) {
						return false;
					}
				}
				if (effectiveDirective !== body.effectiveDirective) {
					return false;
				}
				if (sourceFile !== undefined && body.sourceFile !== undefined) {
					if (typeof sourceFile === 'string') {
						if (sourceFile !== body.sourceFile) {
							return false;
						}
					} else if (!sourceFile.test(body.sourceFile)) {
						return false;
					}
				}
				if (sample !== undefined && body.sample !== undefined) {
					if (sample !== body.sample) {
						return false;
					}
				}

				return true;
			}),
	);

export const cspApp = new Hono().post(headerValidator, async (context) => {
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
	const dao = new ReportCspDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_REPORT')}`);

	const dbInsertList: Readonly<Omit<DCsp, 'registered_at'>>[] = reportingList.map((reporting) => {
		const { body, user_agent: userAgent } = reporting;

		return {
			document_url: body.documentURL,
			referrer: body.referrer,
			blocked_url: body.blockedURL,
			effective_directive: body.effectiveDirective,
			original_policy: body.originalPolicy,
			source_file: body.sourceFile,
			sample: body.sample,
			disposition: body.disposition,
			status_code: body.statusCode,
			line_number: body.lineNumber,
			column_number: body.columnNumber,
			ua: userAgent,
		};
	});

	try {
		await dao.insert(dbInsertList);
	} catch (e) {
		if (e instanceof SqliteError) {
			if (e.code === 'SQLITE_BUSY') {
				logger.warn(e.message);
			} else {
				logger.error(e.message);
			}

			return context.json({ message: e.message }, 500);
		}

		throw e;
	}

	/* 既知のエラーは通知除外する */
	const noticeList = noticeFilter(reportingList);
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
