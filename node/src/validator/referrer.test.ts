import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';

const origin = env('REFERRER_ORIGINS', 'string[]').at(0)!;

await test('documentURL undefined', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
		headers: new Headers({ Origin: origin }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `documentURL` parameter is invalid');
});

await test('referrer undefined', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ documentURL: 'xxx' }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `referrer` parameter is invalid');
});
