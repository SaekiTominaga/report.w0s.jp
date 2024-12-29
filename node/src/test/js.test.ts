import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

const origin = process.env['CORS_ORIGINS']?.split(' ').at(0);
if (origin === undefined) {
	throw new Error('Origin for CORS is not set');
}

await test('cors', async () => {
	const res = await app.request('/report/js', {
		method: 'post',
	});

	assert.equal(res.status, 403);
	assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
	assert.equal(await res.text(), '`Access-Control-Allow-Origin` header does not exist');
});

await test('validator', async (t) => {
	await t.test('location undefined', async () => {
		const res = await app.request('/report/js', {
			method: 'post',
			headers: new Headers({ Origin: origin }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `location`');
	});

	await t.test('message undefined', async () => {
		const res = await app.request('/report/js', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
			body: JSON.stringify({ location: 'xxx' }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `message`');
	});

	await t.test('filename undefined', async () => {
		const res = await app.request('/report/js', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
			body: JSON.stringify({ location: 'xxx', message: 'xxx' }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `filename`');
	});

	await t.test('lineno undefined', async () => {
		const res = await app.request('/report/js', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
			body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx' }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `lineno`');
	});

	await t.test('colno undefined', async () => {
		const res = await app.request('/report/js', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
			body: JSON.stringify({ location: 'xxx', message: 'xxx', filename: 'xxx', lineno: 1 }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `colno`');
	});
});

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
