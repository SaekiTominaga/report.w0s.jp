interface Filter {
	blockedURL?: string;
	effectiveDirective: string;
	sourceFile?: string;
	sample?: string;
}

const noticeFilter: Filter[] = [
	{ blockedURL: 'https://analytics.w0s.jp', effectiveDirective: 'script-src' }, // old Safari
	{ blockedURL: 'https://analytics.w0s.jp/matomo/matomo.js', effectiveDirective: 'script-src' }, // old Safari
	{ blockedURL: 'data', effectiveDirective: 'media-src' }, // moz-extension (NoScript)
	{ blockedURL: 'inline', effectiveDirective: 'script-src-elem', sourceFile: 'moz-extension' }, // moz-extension (Violentmonkey)
	{ blockedURL: 'trusted-types-policy', effectiveDirective: 'trusted-types', sourceFile: 'chrome-extension', sample: 'dompurify' },
	{ blockedURL: 'eval', effectiveDirective: 'script-src', sourceFile: 'chrome-extension' },
	{ blockedURL: 'wasm-eval', effectiveDirective: 'script-src', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'fenced-frame-src' },
];

export default {
	noticeFilter: noticeFilter,
};
