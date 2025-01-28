import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import { env } from '../util/env.js';
import { parseRequestJson, cors, narrowBody } from './csp.js';

const origin = env('CSP_ALLOW_ORIGINS', 'string[]').at(0)!;

await test('parseRequestJson()', async (t) => {
	await t.test('Reporting Api v1', () => {
		const reportings = parseRequestJson(
			[
				{
					age: 0,
					body: {
						documentURL: 'https://example.com/1',
						referrer: 'referrer',
						blockedURL: 'blockedURL',
						effectiveDirective: 'effectiveDirective',
						originalPolicy: 'originalPolicy',
						sourceFile: 'sourceFile',
						sample: 'sample',
						disposition: 'enforce',
						statusCode: 11,
						lineNumber: 12,
						columnNumber: 13,
					},
					type: 'csp-violation',
					url: 'https://example.com/2',
					user_agent: 'UA1',
				},
				{
					age: 99,
					body: {
						key1: 'foo',
						key2: 'bar',
					},
					type: 'another-type',
					url: 'https://example.com/3',
					user_agent: 'UA2',
				},
			],
			{
				contentType: 'application/reports+json',
				ua: 'UA3',
			},
		);

		assert.deepEqual(reportings, [
			{
				age: 0,
				body: {
					documentURL: 'https://example.com/1',
					referrer: 'referrer',
					blockedURL: 'blockedURL',
					effectiveDirective: 'effectiveDirective',
					originalPolicy: 'originalPolicy',
					sourceFile: 'sourceFile',
					sample: 'sample',
					disposition: 'enforce',
					statusCode: 11,
					lineNumber: 12,
					columnNumber: 13,
				},
				type: 'csp-violation',
				url: 'https://example.com/2',
				user_agent: 'UA1',
			},
		]);
	});

	await t.test('Safari', () => {
		const reportings = parseRequestJson(
			{
				body: {
					documentURL: 'https://example.com/1',
					effectiveDirective: 'effectiveDirective',
					originalPolicy: 'originalPolicy',
					disposition: 'enforce',
					statusCode: 11,
				},
				type: 'csp-violation',
				url: 'https://example.com/2',
			},
			{
				contentType: 'application/csp-report',
				ua: 'UA1',
			},
		);

		assert.deepEqual(reportings, [
			{
				age: -1,
				body: {
					documentURL: 'https://example.com/1',
					effectiveDirective: 'effectiveDirective',
					originalPolicy: 'originalPolicy',
					disposition: 'enforce',
					statusCode: 11,
				},
				type: 'csp-violation',
				url: 'https://example.com/2',
				user_agent: 'UA1',
			},
		]);
	});

	await t.test('report-uri', async (t2) => {
		await t2.test('minimum', () => {
			const reportings = parseRequestJson(
				{
					'csp-report': {
						'document-uri': 'https://example.com/',
						'effective-directive': 'effective-directive',
						'violated-directive': 'violated-directive',
						'original-policy': 'original-policy',
						'status-code': 11,
					},
				},
				{
					contentType: 'application/csp-report',
					ua: 'UA',
				},
			);

			assert.deepEqual(reportings, [
				{
					age: -1,
					body: {
						documentURL: 'https://example.com/',
						effectiveDirective: 'effective-directive',
						originalPolicy: 'original-policy',
						disposition: undefined,
						statusCode: 11,
					},
					type: 'csp-violation',
					url: 'https://example.com/',
					user_agent: 'UA',
				},
			]);
		});

		await t2.test('all', () => {
			const reportings = parseRequestJson(
				{
					'csp-report': {
						'document-uri': 'https://example.com/',
						referrer: 'referrer',
						'blocked-uri': 'blocked-uri',
						'effective-directive': 'effective-directive',
						'violated-directive': 'violated-directive',
						'original-policy': 'original-policy',
						disposition: 'enforce',
						'status-code': 11,
						'script-sample': 'script-sample',
						'source-file': 'source-file',
						'line-number': 12,
						'column-number': 13,
					},
				},
				{
					contentType: 'application/csp-report',
					ua: 'UA',
				},
			);

			assert.deepEqual(reportings, [
				{
					age: -1,
					body: {
						documentURL: 'https://example.com/',
						referrer: 'referrer',
						blockedURL: 'blocked-uri',
						effectiveDirective: 'effective-directive',
						originalPolicy: 'original-policy',
						sourceFile: 'source-file',
						sample: 'script-sample',
						disposition: 'enforce',
						statusCode: 11,
						lineNumber: 12,
						columnNumber: 13,
					},
					type: 'csp-violation',
					url: 'https://example.com/',
					user_agent: 'UA',
				},
			]);
		});
	});
});

await test('cors()', async (t) => {
	await t.test('invalid documentURL', () => {
		assert.equal(
			cors(
				[
					{
						age: 0,
						body: {
							documentURL: 'xxx',
							effectiveDirective: 'effectiveDirective',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				],
				[],
			),
			false,
		);
	});

	await t.test('disallow documentURL origin', () => {
		assert.equal(
			cors(
				[
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							effectiveDirective: 'effectiveDirective',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				],
				['http://example.net'],
			),
			false,
		);
	});
});

await test('narrowBody()', async (t) => {
	await t.test('no blockedURL', async (t2) => {
		await t2.test('disallow effectiveDirective', () => {
			assert.deepEqual(
				narrowBody([
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							effectiveDirective: 'connect-src',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							effectiveDirective: 'fenced-frame-src',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				]),
				[
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							effectiveDirective: 'connect-src',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				],
			);
		});

		await t2.test('allow effectiveDirective', () => {
			assert.equal(
				narrowBody([
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							effectiveDirective: 'effectiveDirective',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				]).length,
				1,
			);
		});
	});

	await t.test('exist blockedURL', async (t2) => {
		await t2.test('invalid blockedURL', () => {
			assert.equal(
				narrowBody([
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							blockedURL: 'xxx',
							effectiveDirective: 'effectiveDirective',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				]).length,
				0,
			);
		});

		await t2.test('disallow blockedURL & effectiveDirective', () => {
			assert.equal(
				narrowBody([
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							blockedURL: 'https://csi.gstatic.com/csi?foo',
							effectiveDirective: 'connect-src',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/documentURL',
							blockedURL: 'http://example.com/blockedURL',
							effectiveDirective: 'fenced-frame-src',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				]).length,
				0,
			);
		});

		await t2.test('allow blockedURL & effectiveDirective', () => {
			assert.equal(
				narrowBody([
					{
						age: 0,
						body: {
							documentURL: 'http://example.com/xxx',
							effectiveDirective: 'effectiveDirective',
							originalPolicy: 'originalPolicy',
							disposition: 'enforce',
							statusCode: 11,
						},
						type: 'csp-violation',
						url: 'https://example.com/',
						user_agent: 'Mozilla/5.0...',
					},
				]).length,
				1,
			);
		});
	});
});

await test('success', async () => {
	const res = await app.request('/report/csp', {
		method: 'post',
		headers: new Headers({ 'Content-Type': 'application/reports+json' }),
		body: JSON.stringify([
			{
				age: 0,
				body: {
					documentURL: `${origin}/documentURL`,
					referrer: 'referrer',
					blockedURL: 'http://example.com/blockedURL',
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
				url: 'https://example.com/1',
				user_agent: 'Mozilla/5.0...',
			},
		]),
	});

	assert.equal(res.status, 204);
	assert.equal(res.headers.get('Content-Type'), null);
	assert.equal(await res.text(), '');
});
