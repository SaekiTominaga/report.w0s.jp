import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import { env } from '../util/env.js';

const origin = env('CSP_ALLOW_ORIGINS', 'string[]').at(0)!;

await test('Reporting API v1', async (t) => {
	await t.test('`documentURL` invalid URL', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
			headers: new Headers({ 'Content-Type': 'application/reports+json' }),
			body: JSON.stringify([
				{
					age: 0,
					body: {
						documentURL: `xxx`,
						referrer: 'referrer',
						blockedURL: 'blockedURL',
						effectiveDirective: 'effectiveDirective',
						originalPolicy: 'originalPolicy',
						sourceFile: 'sourceFile',
						sample: 'sample',
						disposition: 'disposition',
						statusCode: 11,
						lineNumber: 12,
						columnNumber: 13,
					},
					type: 'csp-violation',
					url: 'https://example.com/',
					user_agent: 'Mozilla/5.0...',
				},
			]),
		});

		assert.equal(res.status, 403);
		assert.equal((await res.json()).message, 'The violation’s url is not an allowed origin');
	});

	await t.test('`documentURL` invalid origin', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
			headers: new Headers({ 'Content-Type': 'application/reports+json' }),
			body: JSON.stringify([
				{
					age: 0,
					body: {
						documentURL: `http://example.com/xxx`,
						referrer: 'referrer',
						blockedURL: 'blockedURL',
						effectiveDirective: 'effectiveDirective',
						originalPolicy: 'originalPolicy',
						sourceFile: 'sourceFile',
						sample: 'sample',
						disposition: 'disposition',
						statusCode: 11,
						lineNumber: 12,
						columnNumber: 13,
					},
					type: 'csp-violation',
					url: 'https://example.com/',
					user_agent: 'Mozilla/5.0...',
				},
			]),
		});

		assert.equal(res.status, 403);
		assert.equal((await res.json()).message, 'The violation’s url is not an allowed origin');
	});

	await t.test('success', async () => {
		const res = await app.request('/report/csp', {
			method: 'post',
			headers: new Headers({ 'Content-Type': 'application/reports+json' }),
			body: JSON.stringify([
				{
					age: 0,
					body: {
						documentURL: `${origin}/documentURL1`,
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
					type: 'csp-violation',
					url: 'https://example.com/1',
					user_agent: 'Mozilla/5.0...',
				},
				{
					age: 1,
					body: {
						documentURL: `${origin}/documentURL2`,
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
					type: 'csp-violation',
					url: 'https://example.com/2',
					user_agent: 'Mozilla/5.0...',
				},
				{
					age: 999,
					body: {
						xxx1: 'xxx1',
						xxx2: 'xxx2',
					},
					type: 'another-type',
					url: 'https://example.com/999',
					user_agent: 'Mozilla/5.0...',
				},
			]),
		});

		assert.equal(res.status, 204);
		assert.equal(res.headers.get('Content-Type'), null);
		assert.equal(await res.text(), '');
	});
});

await test('report-uri', async (t) => {
	await t.test('success', async (t2) => {
		await t2.test('minimum', async () => {
			const res = await app.request('/report/csp', {
				method: 'post',
				headers: new Headers({ 'Content-Type': 'application/csp-report' }),
				body: JSON.stringify({
					'csp-report': {
						'document-uri': `${origin}/document-uri`,
						'effective-directive': 'effective-directive',
						'violated-directive': 'violated-directive',
						'original-policy': 'original-policy',
						'status-code': 1,
					},
				}),
			});

			assert.equal(res.status, 204);
			assert.equal(res.headers.get('Content-Type'), null);
			assert.equal(await res.text(), '');
		});

		await t2.test('all', async () => {
			const res = await app.request('/report/csp', {
				method: 'post',
				headers: new Headers({ 'Content-Type': 'application/csp-report' }),
				body: JSON.stringify({
					'csp-report': {
						'document-uri': `${origin}/document-uri`,
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
});
