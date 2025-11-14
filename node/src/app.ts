import fs from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import config from './config/hono.ts';
import { cspApp } from './controller/csp.ts';
import { jsApp } from './controller/js.ts';
import { jsSampleApp } from './controller/jsSample.ts';
import { referrerApp } from './controller/referrer.ts';
import { referrerSampleApp } from './controller/referrerSample.ts';
import { csp as cspHeader, reportingEndpoints as reportingEndpointsHeader } from './util/httpHeader.ts';
import { isApi } from './util/request.ts';

loadEnvFile(process.env['NODE_ENV'] === 'production' ? '.env.production' : '.env.development');

/* Logger */
Log4js.configure(env('LOGGER'));
const logger = Log4js.getLogger();

/* Hono */
const app = new Hono();

app.use(async (context, next) => {
	/* HSTS */
	context.header('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	context.header('Content-Security-Policy', cspHeader(config.response.header.csp));

	/* Report */
	context.header('Reporting-Endpoints', reportingEndpointsHeader(config.response.header.reportingEndpoints));

	/* MIME スニッフィング抑止 */
	context.header('X-Content-Type-Options', 'nosniff');

	await next();
});

app.get('/favicon.ico', async (context) => {
	const file = await fs.promises.readFile(`${config.static.root}/favicon.svg`);

	context.header('Content-Type', 'image/svg+xml;charset=utf-8');
	context.header('Cache-Control', 'max-age=604800');
	return context.body(Buffer.from(file));
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
			const { res } = context;

			const urlPath = path.normalize(localPath).substring(path.normalize(config.static.root).length).replaceAll(path.sep, '/'); // URL のパス部分 e.g. ('/foo.html')
			const urlExtension = path.extname(urlPath); // URL の拡張子部分 (e.g. '.html')

			/* Cache-Control */
			const cacheControl =
				config.static.headers.cacheControl.extension.find((ccExt) => ccExt.extensions.includes(urlExtension))?.value ??
				config.static.headers.cacheControl.default;
			res.headers.set('Cache-Control', cacheControl);
		},
	}),
);

/* CORS */
app.use(
	`/${config.api.dir}/csp`,
	cors({
		origin: env('CSP_ALLOW_ORIGINS', 'string[]'),
		allowMethods: config.api.allowMethods,
	}),
);
app.use(
	`/${config.api.dir}/js`,
	cors({
		origin: env('JS_ALLOW_ORIGINS', 'string[]'),
		allowMethods: config.api.allowMethods,
	}),
);
app.use(
	`/${config.api.dir}/js-sample`,
	cors({
		origin: env('JS_SAMPLE_ALLOW_ORIGINS', 'string[]'),
		allowMethods: config.api.allowMethods,
	}),
);
app.use(
	`/${config.api.dir}/referrer`,
	cors({
		origin: env('REFERRER_ORIGINS', 'string[]'),
		allowMethods: config.api.allowMethods,
	}),
);
app.use(
	`/${config.api.dir}/referrer-sample`,
	cors({
		origin: env('REFERRER_SAMPLE_ORIGINS', 'string[]'),
		allowMethods: config.api.allowMethods,
	}),
);

/* Routes */
app.route(`/${config.api.dir}/csp`, cspApp);
app.route(`/${config.api.dir}/js`, jsApp);
app.route(`/${config.api.dir}/js-sample`, jsSampleApp);
app.route(`/${config.api.dir}/referrer`, referrerApp);
app.route(`/${config.api.dir}/referrer-sample`, referrerSampleApp);

/* Error pages */
app.notFound((context) => {
	const TITLE = '404 Not Found';

	if (isApi(context)) {
		return context.json({ message: TITLE }, 404);
	}

	return context.html(
		`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>${TITLE}</h1>`,
		404,
	);
});
app.onError((err, context) => {
	const TITLE_4XX = 'Client error';
	const TITLE_5XX = 'Server error';

	let status: ContentfulStatusCode = 500;
	let title = TITLE_5XX;
	let message: string | undefined;
	if (err instanceof HTTPException) {
		status = err.status;
		message = err.message;

		if (err.status >= 400 && err.status < 500) {
			logger.info(err.status, err.message, context.req.header('User-Agent'));
			title = TITLE_4XX;
		} else {
			logger.error(err.message);
		}
	} else {
		logger.fatal(err.message);
	}

	if (isApi(context)) {
		return context.json({ message: message ?? title }, status);
	}

	return context.html(
		`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>${title}</h1>`,
		status,
	);
});

/* HTTP Server */
if (process.env['TEST'] !== 'test') {
	const port = env('PORT', 'number');
	logger.info(`Server is running on http://localhost:${String(port)}`);

	serve({
		fetch: app.fetch,
		port: port,
	});
}

export default app;
