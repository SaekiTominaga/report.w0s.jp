import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

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
