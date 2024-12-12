import fs from 'node:fs';
import path from 'node:path';
import * as dotenv from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import Log4js from 'log4js';
import config from './hono.config.js';
import JsController from './controller/JsController.js';
import ReferrerController from './controller/ReferrerController.js';
import jsValidator from './validator/js.js';
import referrerValidator from './validator/referrer.js';

dotenv.config({
	path: process.env['NODE_ENV'] === 'production' ? '.env.production' : '.env.development',
});

/* Logger */
const loggerFilePath = process.env['LOGGER'];
if (loggerFilePath === undefined) {
	throw new Error('Logger file path not defined');
}
Log4js.configure(loggerFilePath);
const logger = Log4js.getLogger();

/* Hono */
const app = new Hono();

app.use(async (context, next) => {
	const { headers } = context.res;

	/* HSTS */
	headers.set('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	headers.set('Content-Security-Policy', config.response.header.csp);

	/* Report */
	headers.set(
		'Reporting-Endpoints',
		Object.entries(config.response.header.reportingEndpoints)
			.map((endpoint) => `${endpoint[0]}="${endpoint[1]}"`)
			.join(','),
	);

	/* MIME スニッフィング抑止 */
	headers.set('X-Content-Type-Options', 'nosniff');

	await next();
});

app.get('/favicon.ico', async (context, next) => {
	const file = await fs.promises.readFile(`${config.static.root}/favicon.ico`);

	context.res.headers.set('Content-Type', 'image/svg+xml;charset=utf-8');
	context.body(file);

	await next();
});

app.use(
	serveStatic({
		root: config.static.root,
		index: config.static.index,
		precompressed: false,
		rewriteRequestPath: (urlPath) => {
			if (urlPath.endsWith('/') || urlPath.includes('.')) {
				return urlPath;
			}

			return `${urlPath}${config.static.extension}`;
		},
		onFound: (localPath, context) => {
			const urlPath = path.normalize(localPath).substring(path.normalize(config.static.root).length).replaceAll(path.sep, '/'); // URL のパス部分 e.g. ('/foo.html')
			const urlExtension = path.extname(urlPath); // URL の拡張子部分 (e.g. '.html')

			/* Cache-Control */
			const cacheControl =
				config.static.headers.cacheControl.path.find((ccPath) => ccPath.paths.includes(urlPath))?.value ??
				config.static.headers.cacheControl.extension.find((ccExt) => ccExt.extensions.includes(urlExtension))?.value ??
				config.static.headers.cacheControl.default;
			context.header('Cache-Control', cacheControl);
		},
	}),
);

/* CORS */
const corsAllowOrigins = process.env['CORS_ORIGINS']?.split(' ');
app.use(
	'/report/*',
	cors({
		origin: corsAllowOrigins ?? '*',
		allowMethods: ['POST'],
	}),
);

/* JavaScript error */
app.post('/report/js', jsValidator, async (context) => await new JsController().execute(context));
app.post('/report/js-sample', jsValidator, () => new Response(null, { status: 204 }));

/* Referrer error */
app.post('/report/referrer', referrerValidator, async (context) => await new ReferrerController().execute(context));
app.post('/report/referrer-sample', referrerValidator, () => new Response(null, { status: 204 }));

app.notFound((context) =>
	context.html(
		`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>404 Not Found</h1>`,
		404,
	),
);
app.onError((err, context) => {
	const MESSAGE_5XX = 'Server error has occurred';

	if (err instanceof HTTPException) {
		const { status, message } = err;

		if (status >= 400 && status < 500) {
			logger.info(message, context.req.header('User-Agent'));
		} else {
			if (message !== '') {
				logger.error(message);
			}
			err.message = MESSAGE_5XX;
		}

		return err.getResponse();
	}

	logger.fatal(err.message);
	return context.text(MESSAGE_5XX, 500);
});

/* HTTP Server */
const port = process.env['PORT'];
if (port === undefined) {
	throw new Error('Port not defined');
}
logger.info(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port: Number(port),
});
