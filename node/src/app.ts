import cors from 'cors';
import Express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import JsController from './controller/JsController.js';
import Log4js from 'log4js';
import path from 'path';
import ReferrerController from './controller/ReferrerController.js';
import { ReportW0SJp as Configure } from '../configure/type/report';
import { TypeMap } from 'mime';

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(fs.readFileSync('node/configure/report.json', 'utf8'));

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

const app = Express();

app.set('x-powered-by', false);
app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.use((req, res, next) => {
	const requestPath = req.path;

	let requestFilePath: string | undefined; // 実ファイルパス
	if (requestPath.endsWith('/')) {
		/* ディレクトリトップ（e.g. /foo/ ） */
		const fileName = config.static.indexes?.find((name) => fs.existsSync(`${config.static.root}/${requestPath}${name}`));
		if (fileName !== undefined) {
			requestFilePath = `${requestPath}${fileName}`;
		}
	} else if (path.extname(requestPath) === '') {
		/* 拡張子のない URL（e.g. /foo ） */
		const extension = config.static.extensions?.find((ext) => fs.existsSync(`${config.static.root}/${requestPath}.${ext}`));
		if (extension !== undefined) {
			requestFilePath = `${requestPath}.${extension}`;
		}
	} else {
		/* 拡張子のある URL（e.g. /foo.txt ） */
		requestFilePath = requestPath;
	}

	/* Content-Type */
	const mimeOfPath = Object.entries(<{ [key: string]: string[] }>config.static.headers.mime.path).find(
		([, paths]) => requestFilePath !== undefined && paths.includes(requestFilePath)
	)?.[0]; // ファイルパスから決定される MIME
	const mimeOfExtension = Object.entries(<TypeMap>config.static.headers.mime.extension).find(
		([, extensions]) => requestFilePath !== undefined && extensions.includes(path.extname(requestFilePath).substring(1))
	)?.[0]; // 拡張子から決定される MIME
	const mime = mimeOfPath ?? mimeOfExtension;

	if (mime === undefined) {
		if (requestFilePath !== undefined) {
			logger.info('MIME が未定義のファイル', requestPath);
		}
	} else {
		logger.debug('Content-Type', `${requestPath} - ${mime}`);

		res.setHeader('Content-Type', mime);
	}

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
			const requestUrl = res.req.url;
			const extension = path.extname(localPath); // 拡張子

			/* Cache */
			if (config.static.headers.cache_control !== undefined) {
				const cacheControlValue =
					config.static.headers.cache_control.path.find((path) => path.paths.includes(requestUrl))?.value ??
					config.static.headers.cache_control.extension.find((ext) => ext.extensions.includes(extension))?.value ??
					config.static.headers.cache_control.default;

				logger.debug('Cache-Control', `${requestUrl} - ${cacheControlValue}`);

				res.setHeader('Cache-Control', cacheControlValue);
			}
		},
	})
);

/**
 * JavaScript エラー
 */
const corsJsPreflightedRequestCallback = cors({
	origin: config.js.allow_origins,
	methods: ['POST'],
});
const corsJsCallback = cors({
	origin: config.js.allow_origins,
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
	origin: config.referrer.allow_origins,
	methods: ['POST'],
});
const corsReferrerCallback = cors({
	origin: config.referrer.allow_origins,
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
