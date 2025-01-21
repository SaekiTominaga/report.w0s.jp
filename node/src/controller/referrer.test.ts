import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import { env } from '../util/env.js';

const origin = env('REFERRER_ORIGINS', 'string[]').at(0)!;

await test('cors', async (t) => {
	await t.test('no origin', async () => {
		const res = await app.request('/report/referrer', {
			method: 'options',
		});

		assert.equal(res.status, 204);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
	});

	await t.test('disallow origin', async () => {
		const res = await app.request('/report/referrer', {
			method: 'options',
			headers: new Headers({ Origin: 'http://example.com' }),
		});

		assert.equal(res.status, 204);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
	});

	await t.test('allow origin', async () => {
		const res = await app.request('/report/referrer', {
			method: 'options',
			headers: new Headers({ Origin: origin }),
		});

		assert.equal(res.status, 204);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
	});
});

await test('success', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', referrer: 'xxx' }),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});
