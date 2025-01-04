import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from './app.js';

await test('Top page', async () => {
	const res = await app.request('/');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	assert.equal(res.headers.get('Cache-Control'), 'max-age=600');
});

await test('Cache-Control: extension', async () => {
	const res = await app.request('/apple-touch-icon.png');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'image/png');
	assert.equal(res.headers.get('Cache-Control'), 'max-age=3600');
});

await test('favicon.ico', async () => {
	const res = await app.request('/favicon.ico');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'image/svg+xml;charset=utf-8');
	assert.equal(res.headers.get('Cache-Control'), 'max-age=604800');
});

await test('404', async () => {
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
