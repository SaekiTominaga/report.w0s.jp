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

await test('success', async () => {
	const res = await app.request('/report/csp', {
		method: 'post',
		headers: new Headers({ Origin: origin, 'Content-Type': 'application/csp-report' }),
		body: JSON.stringify({
			'csp-report': {
				'document-uri': 'document-uri',
				referrer: 'referrer',
				'blocked-uri': 'blocked-uri',
				'effective-directive': 'effective-directive',
				'violated-directive': 'violated-directive',
				'original-policy': 'original-policy',
				disposition: 'disposition',
				'status-code': 1,
				'script-sample': 'script-sample',
				'source-file': 'source-file',
				'line-number': 2,
				'column-number': 3,
			},
		}),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});
