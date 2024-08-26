import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import Log4js from 'log4js';
import type { ReportW0SJp as Configure } from '../../configure/type/common.js';
import JsController from './controller/JsController.js';
import ReferrerController from './controller/ReferrerController.js';

/* 設定ファイル読み込み */
const config = JSON.parse((await fs.promises.readFile('configure/common.json')).toString()) as Configure;

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

const app = express();

app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

app.use(
	(_req, res, next) => {
		/* HSTS */
		res.setHeader('Strict-Transport-Security', config.response.header.hsts);

		/* CSP */
		res.setHeader('Content-Security-Policy', config.response.header.csp);

		/* Report */
		res.setHeader(
			'Reporting-Endpoints',
			Object.entries(config.response.header.reporting_endpoints)
				.map((endpoint) => `${endpoint[0]}="${endpoint[1]}"`)
				.join(','),
		);

		/* MIME スニッフィング抑止 */
		res.setHeader('X-Content-Type-Options', 'nosniff');

		next();
	},
	express.json(),
	express.static(config.static.root, {
		extensions: config.static.extensions?.map((ext) => /* 拡張子の . は不要 */ ext.substring(1)),
		index: config.static.indexes,
		setHeaders: (res, localPath) => {
			const requestUrl = res.req.url; // リクエストパス e.g. ('/foo.html.br')
			const requestUrlOrigin = requestUrl.endsWith(config.extension.brotli)
				? requestUrl.substring(0, requestUrl.length - config.extension.brotli.length)
				: requestUrl; // 元ファイル（圧縮ファイルではない）のリクエストパス (e.g. '/foo.html')
			const localPathOrigin = localPath.endsWith(config.extension.brotli)
				? localPath.substring(0, localPath.length - config.extension.brotli.length)
				: localPath; // 元ファイルの絶対パス (e.g. '/var/www/public/foo.html')
			const extensionOrigin = path.extname(localPathOrigin); // 元ファイルの拡張子 (e.g. '.html')

			/* Content-Type */
			const mimeType =
				Object.entries(config.static.headers.mime_type.path)
					.find(([filePath]) => filePath === requestUrlOrigin)
					?.at(1) ??
				Object.entries(config.static.headers.mime_type.extension)
					.find(([fileExtension]) => fileExtension === extensionOrigin)
					?.at(1);
			if (mimeType === undefined) {
				logger.error(`MIME type is undefined: ${requestUrlOrigin}`);
			}
			res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');

			/* Cache-Control */
			if (config.static.headers.cache_control !== undefined) {
				const cacheControl =
					config.static.headers.cache_control.path.find((ccPath) => ccPath.paths.includes(requestUrlOrigin))?.value ??
					config.static.headers.cache_control.extension.find((ccExt) => ccExt.extensions.includes(extensionOrigin))?.value ??
					config.static.headers.cache_control.default;

				res.setHeader('Cache-Control', cacheControl);
			}
		},
	}),
);

/**
 * JavaScript エラー
 */
const corsJsPreflightedRequestCallback = cors({
	origin: config.cors.allow_origins,
	methods: ['POST'],
});
const corsJsCallback = cors({
	origin: config.cors.allow_origins,
});
app.options(['/js', '/js-sample'], corsJsPreflightedRequestCallback);
app.post('/js', corsJsCallback, async (req, res, next) => {
	try {
		await new JsController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});
app.post('/js-sample', corsJsCallback, (_req, res) => {
	res.status(204).end();
});

/**
 * リファラーエラー
 */
const corsReferrerPreflightedRequestCallback = cors({
	origin: config.cors.allow_origins,
	methods: ['POST'],
});
const corsReferrerCallback = cors({
	origin: config.cors.allow_origins,
});
app.options(['/referrer', '/referrer-sample'], corsReferrerPreflightedRequestCallback);
app.post('/referrer', corsReferrerCallback, async (req, res, next) => {
	try {
		await new ReferrerController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});
app.post('/referrer-sample', corsReferrerCallback, (_req, res) => {
	res.status(204).end();
});

/**
 * エラー処理
 */
app.use((req, res): void => {
	logger.warn(`404 Not Found: ${req.method} ${req.url}`);

	res.status(404).send(`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>404 Not Found</h1>`);
});
app.use((err: Error, req: Request, res: Response, _next: NextFunction /* eslint-disable-line @typescript-eslint/no-unused-vars */): void => {
	logger.fatal(`${req.method} ${req.url}`, err.stack);

	res.status(500).send(`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>500 Internal Server Error</h1>`);
});

/**
 * HTTP サーバー起動
 */
app.listen(config.port, () => {
	logger.info(`Example app listening at http://localhost:${String(config.port)}`);
});
