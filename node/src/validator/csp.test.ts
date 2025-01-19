import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

await test('header', async (t) => {
	await t.test('Content-Type', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
		});

		assert.equal(res.status, 400);
		assert.equal((await res.json()).message, 'The `Content-Type` request header is invalid');
	});
});
