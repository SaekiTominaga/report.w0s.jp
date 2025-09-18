interface Filter {
	blockedURL?: string | RegExp;
	effectiveDirective: string;
	sourceFile?: string | RegExp;
	sample?: string;
}

const noticeFilter: Filter[] = [
	{ effectiveDirective: 'connect-src', blockedURL: /^https:\/\/analytics\.w0s\.jp\/matomo\/matomo\.php\?/v },
	{ effectiveDirective: 'font-src', blockedURL: /^https:\/\/fonts\.gstatic\.com\/s\//v },
	{ effectiveDirective: 'media-src', blockedURL: 'data' }, // moz-extension (NoScript)
	{ effectiveDirective: 'script-src', blockedURL: 'https://analytics.w0s.jp' }, // old Safari
	{ effectiveDirective: 'script-src', blockedURL: 'https://analytics.w0s.jp/matomo/matomo.js' }, // old Safari
	{ effectiveDirective: 'script-src', blockedURL: 'eval', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'script-src', blockedURL: 'wasm-eval', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'script-src-elem', blockedURL: 'inline', sourceFile: 'moz-extension' }, // moz-extension (Violentmonkey)
	{
		effectiveDirective: 'script-src-elem',
		blockedURL: 'inline',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/content\.js$/v,
	},
	{
		effectiveDirective: 'script-src-elem',
		blockedURL: 'inline',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/js\/utils\.js$/v,
	},
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'default' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'dompurify' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'sanitizer' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: '@azure/ms-rest-js#xml.browser' },
	{ effectiveDirective: 'require-trusted-types-for', blockedURL: 'trusted-types-sink', sample: 'Function|(\n) {\n\n})' }, // old Safari
	{ effectiveDirective: 'fenced-frame-src' },
];

export default {
	noticeFilter: noticeFilter,
};
