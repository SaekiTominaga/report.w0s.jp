import config from '@w0s/oxlint-config/node';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [config],
	options: {
		typeAware: true,
		typeCheck: true,
	},
	overrides: [
		{
			files: ['hono/src/**/*.ts'],
			rules: {
				'node/no-process-env': 'off',
			},
		},
		{
			files: ['hono/src/**/*.test.ts'],
			rules: {
				'typescript/no-unsafe-member-access': 'off',
			},
		},
		{
			files: ['hono/src/db/**/*.ts'],
			rules: {
				'unicorn/no-null': 'off',
			},
		},
		{
			files: ['hono/src/app.ts'],
			rules: {
				'node/callback-return': 'off',
				'promise/prefer-await-to-callbacks': 'off',
			},
		},
	],
});
