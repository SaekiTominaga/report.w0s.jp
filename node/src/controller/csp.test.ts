import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';

const origin = process.env['CORS_ORIGINS']!.split(' ').at(0)!;

await test('success', async (t) => {
	await t.test('Reporting API v1', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
			headers: new Headers({ Origin: origin, 'Content-Type': 'application/reports+json' }),
			body: JSON.stringify([
				{
					age: 1,
					body: {
						documentURL: 'documentURL1',
						referrer: 'referrer1',
						blockedURL: 'blockedURL1',
						effectiveDirective: 'effectiveDirective1',
						originalPolicy: 'originalPolicy1',
						sourceFile: 'sourceFile1',
						sample: 'sample1',
						disposition: 'disposition1',
						statusCode: 11,
						lineNumber: 12,
						columnNumber: 13,
					},
					type: 'cors',
					url: 'https://example.com/1',
					user_agent: 'Mozilla/5.0...',
				},
				{
					age: 2,
					body: {
						documentURL: 'documentURL2',
						referrer: 'referrer2',
						blockedURL: 'blockedURL2',
						effectiveDirective: 'effectiveDirective2',
						originalPolicy: 'originalPolicy2',
						sourceFile: 'sourceFile2',
						sample: 'sample2',
						disposition: 'disposition2',
						statusCode: 21,
						lineNumber: 22,
						columnNumber: 23,
					},
					type: 'cors',
					url: 'https://example.com/2',
					user_agent: 'Mozilla/5.0...',
				},
			]),
		});

		assert.equal(res.status, 204);
		assert.equal(res.headers.get('Content-Type'), null);
		assert.equal(await res.text(), '');
	});

	await t.test('report-uri', async () => {
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
});
