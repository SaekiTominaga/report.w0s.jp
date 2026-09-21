import path from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Logger } from 'winston';
import { env } from '@w0s/env-value-type';
import { getLogger } from './logger.ts';
import config from './config/hono.ts';
import { cspApp } from './controller/csp.ts';
import { jsApp } from './controller/js.ts';
import { jsSampleApp } from './controller/jsSample.ts';
import { referrerApp } from './controller/referrer.ts';
import { referrerSampleApp } from './controller/referrerSample.ts';

interface Variables {
	logger: Logger;
}

const app = new Hono<{ Variables: Variables }>();

/* Logger */
app.use(async (context, next) => {
	context.set('logger', getLogger(context.req.path.slice(1)));
	await next();
});

/* Headers */
app.use(async (context, next) => {
	/* HSTS */
	context.header('Strict-Transport-Security', config.response.header.hsts);

	/* MIME スニッフィング抑止 */
	context.header('X-Content-Type-Options', 'nosniff');

	await next();
});

/* Static files */
app.use(
	serveStatic({
		root: config.static.root,
		index: config.static.index,
		precompressed: false,
		onFound: (localPath, context) => {
			const { res } = context;

			const urlPath = localPath.slice(config.static.root.length).replaceAll(path.sep, '/'); // URL のパス部分 e.g. ('/foo.html')
			const urlExtension = path.extname(urlPath); // URL の拡張子部分 (e.g. '.html')

			/* Content-Type; hono 公式に登録されていない MIME タイプを設定 */
			const contentTypeRecord = Object.entries(config.static.headers.contentType.path).find(([ctPath]) => ctPath === urlPath);
			if (contentTypeRecord !== undefined) {
				const [, contentType] = contentTypeRecord;
				res.headers.set('Content-Type', contentType);
			}

			/* Cache-Control */
			const cacheControl =
				config.static.headers.cacheControl.path.find((ccPath) => ccPath.paths.includes(urlPath))?.value ??
				config.static.headers.cacheControl.extension.find((ccExt) => ccExt.extensions.includes(urlExtension))?.value ??
				config.static.headers.cacheControl.default;
			res.headers.set('Cache-Control', cacheControl);
		},
	}),
);

/* CORS */
app.use(
	`/report/csp`,
	cors({
		origin: env('CSP_ALLOW_ORIGINS', 'string[]'),
		allowMethods: ['POST'],
	}),
);
app.use(
	`/report/js`,
	cors({
		origin: env('JS_ALLOW_ORIGINS', 'string[]'),
		allowMethods: ['POST'],
	}),
);
app.use(
	`/report/js-sample`,
	cors({
		origin: env('JS_SAMPLE_ALLOW_ORIGINS', 'string[]'),
		allowMethods: ['POST'],
	}),
);
app.use(
	`/report/referrer`,
	cors({
		origin: env('REFERRER_ORIGINS', 'string[]'),
		allowMethods: ['POST'],
	}),
);
app.use(
	`/report/referrer-sample`,
	cors({
		origin: env('REFERRER_SAMPLE_ORIGINS', 'string[]'),
		allowMethods: ['POST'],
	}),
);

/* Routes */
app.route(`/report/csp`, cspApp);
app.route(`/report/js`, jsApp);
app.route(`/report/js-sample`, jsSampleApp);
app.route(`/report/referrer`, referrerApp);
app.route(`/report/referrer-sample`, referrerSampleApp);

/* Error pages */
app.notFound((context) => {
	const TITLE = '404 Not Found';

	return context.json({ message: TITLE }, 404);
});
app.onError((err, context) => {
	const logger = context.get('logger');

	const TITLE_4XX = 'Client error';
	const TITLE_5XX = 'Server error';

	let title = TITLE_5XX;
	if (err instanceof HTTPException) {
		if (err.status >= 400 && err.status < 500) {
			title = TITLE_4XX;

			logger.info(`${String(err.status)} ${err.message} <${String(context.req.header('User-Agent'))}>`);
		} else {
			logger.error(err.message);
		}
	} else {
		logger.error(err.stack);
	}

	const status = err instanceof HTTPException ? err.status : 500;
	const message = err instanceof HTTPException ? err.message : undefined;

	return context.json({ message: message ?? title }, status);
});

/* HTTP Server */
if (process.env['TEST'] !== 'test') {
	const logger = getLogger(path.basename(import.meta.url));

	serve(
		{
			fetch: app.fetch,
			port: env('HONO_PORT', 'number'),
		},
		(info) => {
			logger.info(`Server is running on http://localhost:${String(info.port)}`);
		},
	);
}

export default app;

export type { Variables };
