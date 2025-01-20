import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import { env } from '../util/env.js';

const origin = env('REFERRER_ORIGINS').split(' ').at(0)!;

await test('location undefined', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
		headers: new Headers({ Origin: origin }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `location` parameter is invalid');
});

await test('referrer undefined', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx' }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `referrer` parameter is invalid');
});
