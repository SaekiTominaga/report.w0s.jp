import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { test } from 'node:test';
import app from './app.ts';
import config from './config/hono.ts';

await test('headers', async () => {
	const res = await app.request('/');

	assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=31536000');
	assert.equal(res.headers.get('Content-Security-Policy'), "frame-ancestors 'self';report-uri /report/csp;report-to csp");
	assert.equal(res.headers.get('Reporting-Endpoints'), 'csp="/report/csp"');
	assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
});

await test('Top page', async () => {
	const res = await app.request('/');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
});

await test('favicon.ico', async (t) => {
	await t.test('no compression', async () => {
		const [file, res] = await Promise.all([fs.promises.readFile(`${config.static.root}/favicon.svg`), app.request('/favicon.ico')]);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'image/svg+xml;charset=utf-8');
		assert.equal(res.headers.get('Cache-Control'), 'max-age=604800');
		assert.equal(res.headers.get('Content-Length'), String(file.byteLength));
	});

	await t.test('gzip', async () => {
		const res = await app.request('/favicon.ico', {
			headers: { 'Accept-Encoding': 'gzip, deflate' },
		});

		assert.equal(res.headers.get('Content-Encoding'), null);
	});
});

await test('serveStatic', async (t) => {
	await t.test('Cache-Control: extension', async () => {
		const res = await app.request('/apple-touch-icon.png');

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'image/png');
		assert.equal(res.headers.get('Cache-Control'), 'max-age=3600');
	});

	await t.test('Cache-Control: default', async () => {
		const res = await app.request('/robots.txt');

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/plain; charset=utf-8');
		assert.equal(res.headers.get('Cache-Control'), 'max-age=600');
	});
});

await test('404', async (t) => {
	await t.test('normal', async () => {
		const res = await app.request('/foo');

		assert.equal(res.status, 404);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
		assert.equal(
			await res.text(),
			`<!DOCTYPE html>
<html lang=en>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>report.w0s.jp</title>
<h1>404 Not Found</h1>`,
		);
	});

	await t.test('API', async () => {
		const res = await app.request('/report/', {
			method: 'post',
		});

		assert.equal(res.status, 404);
		assert.equal(res.headers.get('Content-Type'), 'application/json');
		assert.deepStrictEqual(await res.json(), { message: '404 Not Found' });
	});
});
