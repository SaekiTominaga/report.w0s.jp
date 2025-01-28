interface Filter {
	blockedURL?: string;
	effectiveDirective: string;
	sourceFile?: string;
	sample?: string;
}

const noticeFilter: Filter[] = [
	{ effectiveDirective: 'fenced-frame-src' },
	{ blockedURL: 'data', effectiveDirective: 'media-src' }, // moz-extension (NoScript)
	{ blockedURL: 'inline', effectiveDirective: 'script-src-elem', sourceFile: 'moz-extension' }, // moz-extension (Violentmonkey)
	{ blockedURL: 'trusted-types-policy', effectiveDirective: 'trusted-types', sourceFile: 'chrome-extension', sample: 'dompurify' }, // chrome-extension
];

export default {
	noticeFilter: noticeFilter,
};
