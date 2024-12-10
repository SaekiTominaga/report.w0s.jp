import path from 'node:path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import Log4js from 'log4js';
import config from './express.config.js';
import JsController from './controller/JsController.js';
import ReferrerController from './controller/ReferrerController.js';

const app = express();

const env = app.get('env') as Express.Env;

dotenv.config({
	path: env === 'production' ? '.env.production' : '.env.development',
});

/* Logger 設定 */
const loggerFilePath = process.env['LOGGER'];
if (loggerFilePath === undefined) {
	throw new Error('Logger file path not defined');
}
Log4js.configure(loggerFilePath);
const logger = Log4js.getLogger();

app.set('trust proxy', true);
app.set('views', process.env['VIEWS']);
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
			Object.entries(config.response.header.reportingEndpoints)
				.map((endpoint) => `${endpoint[0]}="${endpoint[1]}"`)
				.join(','),
		);

		/* MIME スニッフィング抑止 */
		res.setHeader('X-Content-Type-Options', 'nosniff');

		next();
	},
	express.json(),
	express.static(config.static.root, {
		extensions: config.static.extensions.map((ext) => /* 拡張子の . は不要 */ ext.substring(1)),
		index: config.static.indexes,
		setHeaders: (res, localPath) => {
			const requestUrl = res.req.url; // リクエストパス e.g. ('/foo.html.br')
			const extensionOrigin = path.extname(localPath); // 元ファイルの拡張子 (e.g. '.html')

			/* Content-Type */
			const mimeType =
				Object.entries(config.static.headers.mimeType.path)
					.find(([filePath]) => filePath === requestUrl)
					?.at(1) ??
				Object.entries(config.static.headers.mimeType.extension)
					.find(([fileExtension]) => fileExtension === extensionOrigin)
					?.at(1);
			if (mimeType === undefined) {
				logger.error(`MIME type is undefined: ${requestUrl}`);
			}
			res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');

			/* Cache-Control */
			const cacheControl =
				config.static.headers.cacheControl.path.find((ccPath) => ccPath.paths.includes(requestUrl))?.value ??
				config.static.headers.cacheControl.extension.find((ccExt) => ccExt.extensions.includes(extensionOrigin))?.value ??
				config.static.headers.cacheControl.default;

			res.setHeader('Cache-Control', cacheControl);
		},
	}),
);

const corsAllowOrigins = process.env['CORS_ORIGINS']?.split(' ');

/**
 * JavaScript エラー
 */
const corsJsPreflightedRequestCallback = cors({
	origin: corsAllowOrigins,
	methods: ['POST'],
});
const corsJsCallback = cors({
	origin: corsAllowOrigins,
});
app.options(['/js', '/js-sample'], corsJsPreflightedRequestCallback);
app.post('/js', corsJsCallback, async (req, res, next) => {
	try {
		await new JsController().execute(req, res);
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
	origin: corsAllowOrigins,
	methods: ['POST'],
});
const corsReferrerCallback = cors({
	origin: corsAllowOrigins,
});
app.options(['/referrer', '/referrer-sample'], corsReferrerPreflightedRequestCallback);
app.post('/referrer', corsReferrerCallback, async (req, res, next) => {
	try {
		await new ReferrerController().execute(req, res);
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
const port = process.env['PORT'];
if (port === undefined) {
	throw new Error('Port not defined');
}
app.listen(port, () => {
	logger.info(`Example app listening at http://localhost:${port}`);
});
