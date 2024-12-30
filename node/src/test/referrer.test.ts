import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

const origin = process.env['CORS_ORIGINS']?.split(' ').at(0);
if (origin === undefined) {
	throw new Error('Origin for CORS is not set');
}

await test('cors', async () => {
	const res = await app.request('/report/referrer', {
		method: 'post',
	});

	assert.equal(res.status, 403);
	assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
	assert.equal(await res.text(), '`Access-Control-Allow-Origin` header does not exist');
});

await test('validator', async (t) => {
	await t.test('location undefined', async () => {
		const res = await app.request('/report/referrer', {
			method: 'post',
			headers: new Headers({ Origin: origin }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `location`');
	});

	await t.test('referrer undefined', async () => {
		const res = await app.request('/report/referrer', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
			body: JSON.stringify({ location: 'xxx' }),
		});

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
		assert.equal(await res.text(), 'Invalid paramater: `referrer`');
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

await test('sample', async () => {
	const res = await app.request('/report/referrer-sample', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/json' }),
		body: JSON.stringify({ location: 'xxx', referrer: 'xxx' }),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});
