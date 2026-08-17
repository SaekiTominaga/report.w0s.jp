import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from './app.ts';

await test('headers', async () => {
	const res = await app.request('/robots.txt');

	assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=31536000');
	assert.equal(res.headers.get('Content-Security-Policy'), "frame-ancestors 'self';report-uri /report/csp;report-to csp");
	assert.equal(res.headers.get('Reporting-Endpoints'), 'csp="/report/csp"');
	assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
});

await test('serveStatic', async (t) => {
	await t.test('Content-Type', async (t2) => {
		await t2.test('hono default', async () => {
			assert.equal((await app.request('/')).headers.get('Content-Type'), 'text/html; charset=utf-8');
		});

		await t2.test('path', async () => {
			assert.equal((await app.request('/favicon.ico')).headers.get('Content-Type'), 'image/x-icon'); // TODO: 本来は image/svg+xml; charset=utf-8（実際は後者が正しく送信される）
		});
	});

	await t.test('Cache-Control', async (t2) => {
		await t2.test('default', async () => {
			assert.equal((await app.request('/robots.txt')).headers.get('Cache-Control'), 'max-age=600');
		});

		await t2.test('path', async () => {
			assert.equal((await app.request('/favicon.ico')).headers.get('Cache-Control'), 'max-age=604800');
		});

		await t2.test('extension', async () => {
			assert.equal((await app.request('/apple-touch-icon.png')).headers.get('Cache-Control'), 'max-age=3600');
		});
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
<meta name=text-scale content=scale>
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
