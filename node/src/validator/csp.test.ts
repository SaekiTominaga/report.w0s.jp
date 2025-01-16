import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

const origin = process.env['CORS_ORIGINS']!.split(' ').at(0)!;

await test('cors', async () => {
	const res = await app.request('/report/csp', {
		method: 'post',
	});

	assert.equal(res.status, 403);
	assert.equal((await res.json()).message, 'Access from an unauthorized origin');
});

await test('header', async (t) => {
	await t.test('Content-Type', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
			headers: new Headers({ Origin: origin }),
		});

		assert.equal(res.status, 400);
		assert.equal((await res.json()).message, 'The `Content-Type` request header is invalid');
	});
});
