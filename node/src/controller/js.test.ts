import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

const origin = process.env['CORS_ORIGINS']!.split(' ').at(0)!;

await test('success', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx', lineno: 1, colno: 1 }),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});

await test('sample', async () => {
	const res = await app.request('/report/js-sample', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx', lineno: 1, colno: 1 }),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});
