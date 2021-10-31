import cors from 'cors';
import Express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import JsController from './controller/JsController.js';
import Log4js from 'log4js';
import path from 'path';
import ReferrerController from './controller/ReferrerController.js';
import { ReportW0SJp as Configure } from '../configure/type/common.js';

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(fs.readFileSync('node/configure/common.json', 'utf8'));

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

const app = Express();

const EXTENTIONS: { readonly [s: string]: string } = {
	map: '.map',
}; // 静的ファイル拡張子の定義

app.set('x-powered-by', false);
app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.use((_req, res, next) => {
	/* HSTS */
	res.setHeader('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	res.setHeader('Content-Security-Policy', config.response.header.csp);

	/* MIME スニッフィング抑止 */
	res.setHeader('X-Content-Type-Options', 'nosniff');

	next();
});
app.use(Express.json());
app.use(
	Express.static(config.static.root, {
		extensions: config.static.extensions,
		index: config.static.indexes,
		setHeaders: (res, localPath) => {
			const requestUrl = res.req.url; // リクエストパス e.g. ('/foo.html.br')
			const requestUrlOrigin = requestUrl.endsWith(EXTENTIONS.brotli) ? requestUrl.substring(0, requestUrl.length - EXTENTIONS.brotli.length) : requestUrl; // 元ファイル（圧縮ファイルではない）のリクエストパス (e.g. '/foo.html')
			const localPathOrigin = localPath.endsWith(EXTENTIONS.brotli) ? localPath.substring(0, localPath.length - EXTENTIONS.brotli.length) : localPath; // 元ファイルの絶対パス (e.g. '/var/www/public/foo.html')
			const extensionOrigin = path.extname(localPathOrigin); // 元ファイルの拡張子 (e.g. '.html')

			/* Content-Type */
			const mime =
				Object.entries(config.static.headers.mime.path).find(([, paths]) => paths.includes(requestUrlOrigin))?.[0] ??
				Object.entries(config.static.headers.mime.extension).find(([, extensions]) => extensions.includes(extensionOrigin.substring(1)))?.[0];
			if (mime === undefined) {
				logger.error('MIME が未定義のファイル', requestUrlOrigin);
			}
			res.setHeader('Content-Type', mime ?? 'application/octet-stream');

			/* Cache-Control */
			if (config.static.headers.cache_control !== undefined) {
				const cacheControlValue =
					config.static.headers.cache_control.path.find((path) => path.paths.includes(requestUrlOrigin))?.value ??
					config.static.headers.cache_control.extension.find((ext) => ext.extensions.includes(extensionOrigin))?.value ??
					config.static.headers.cache_control.default;

				res.setHeader('Cache-Control', cacheControlValue);
			}
		},
	})
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
app.post('/js-sample', corsJsCallback, async (_req, res) => {
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
app.post('/referrer-sample', corsReferrerCallback, async (_req, res) => {
	res.status(204).end();
});

/**
 * エラー処理
 */
app.use((req, res): void => {
	logger.warn(`404 Not Found: ${req.method} ${req.url}`);
	res.status(404).sendFile(path.resolve(config.errorpage.path_404));
});
app.use((err: Error, req: Request, res: Response, _next: NextFunction /* eslint-disable-line @typescript-eslint/no-unused-vars */): void => {
	logger.fatal(`${req.method} ${req.url}`, err.stack);
	res.status(500).send(`<!DOCTYPE html>
<html lang=ja>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>500 Internal Server Error</h1>`);
});

/**
 * HTTP サーバー起動
 */
app.listen(config.port, () => {
	logger.info(`Example app listening at http://localhost:${config.port}`);
});
