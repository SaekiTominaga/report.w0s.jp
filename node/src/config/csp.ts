interface Filter {
	blockedURL?: string;
	effectiveDirective: string;
	sourceFile?: string | RegExp;
	sample?: string;
}

const noticeFilter: Filter[] = [
	{ blockedURL: 'https://analytics.w0s.jp', effectiveDirective: 'script-src' }, // old Safari
	{ blockedURL: 'https://analytics.w0s.jp/matomo/matomo.js', effectiveDirective: 'script-src' }, // old Safari
	{ blockedURL: 'data', effectiveDirective: 'media-src' }, // moz-extension (NoScript)
	{ blockedURL: 'inline', effectiveDirective: 'script-src-elem', sourceFile: 'moz-extension' }, // moz-extension (Violentmonkey)
	{
		blockedURL: 'inline',
		effectiveDirective: 'script-src-elem',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/js\/utils\.js$/,
	},
	{ blockedURL: 'trusted-types-policy', effectiveDirective: 'trusted-types', sourceFile: 'chrome-extension', sample: 'dompurify' },
	{ blockedURL: 'trusted-types-policy', effectiveDirective: 'trusted-types', sourceFile: 'chrome-extension', sample: 'sanitizer' },
	{ blockedURL: 'eval', effectiveDirective: 'script-src', sourceFile: 'chrome-extension' },
	{ blockedURL: 'wasm-eval', effectiveDirective: 'script-src', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'fenced-frame-src' },
];

export default {
	noticeFilter: noticeFilter,
};
