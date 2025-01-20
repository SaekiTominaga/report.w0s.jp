import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import { env } from '../util/env.js';

const origin = env('JS_ALLOW_ORIGINS').split(' ').at(0)!;

await test('location undefined', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `location` parameter is invalid');
});

await test('message undefined', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx' }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `message` parameter is invalid');
});

await test('filename undefined', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', message: 'xxx' }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `filename` parameter is invalid');
});

await test('lineno undefined', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx' }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `lineno` parameter is invalid');
});

await test('colno undefined', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx', lineno: 1 }),
	});

	assert.equal(res.status, 400);
	assert.equal((await res.json()).message, 'The `colno` parameter is invalid');
});
