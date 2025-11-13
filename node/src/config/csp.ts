interface Filter {
	blockedURL?: string | RegExp;
	effectiveDirective: string;
	sourceFile?: string | RegExp;
	sample?: string;
}

const noticeFilter: Filter[] = [
	{ effectiveDirective: 'connect-src', blockedURL: /^https:\/\/analytics\.w0s\.jp\/matomo\/matomo\.php\?/v },
	{ effectiveDirective: 'font-src', blockedURL: 'chrome-extension' },
	{ effectiveDirective: 'font-src', blockedURL: /^https:\/\/fonts\.gstatic\.com(:443)?\/s\//v },
	{ effectiveDirective: 'frame-src', blockedURL: 'https://pwm-image.trendmicro.jp' },
	{ effectiveDirective: 'img-src', blockedURL: 'blob', sourceFile: /^https:\/\/w0s\.jp:443\//v }, // iPad
	{ effectiveDirective: 'media-src', blockedURL: 'data' }, // moz-extension (NoScript)
	{ effectiveDirective: 'script-src', blockedURL: 'https://analytics.w0s.jp' }, // old Safari
	{ effectiveDirective: 'script-src', blockedURL: 'https://analytics.w0s.jp/matomo/matomo.js' }, // old Safari
	{ effectiveDirective: 'script-src', blockedURL: 'eval', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'script-src', blockedURL: 'wasm-eval', sourceFile: 'chrome-extension' },
	{ effectiveDirective: 'script-src-elem', blockedURL: 'inline', sourceFile: 'moz-extension' }, // moz-extension (Violentmonkey)
	{ effectiveDirective: 'script-src-elem', blockedURL: 'inline', sourceFile: 'sandbox eval code' },
	{ effectiveDirective: 'script-src-elem', blockedURL: 'inline', sourceFile: 'user-script' }, // iPad
	{ effectiveDirective: 'script-src-elem', blockedURL: 'https://analytics.w0s.jp/matomo/matomo.js' },
	{
		effectiveDirective: 'script-src-elem',
		blockedURL: 'inline',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/content\.js$/v,
	},
	{
		effectiveDirective: 'script-src-elem',
		blockedURL: 'inline',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/darkreader\.js$/v,
	},
	{
		effectiveDirective: 'script-src-elem',
		blockedURL: 'inline',
		sourceFile: /^safari-web-extension:\/\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\/js\/utils\.js$/v,
	},
	{
		effectiveDirective: 'style-src-elem',
		blockedURL: /^https:\/\/fonts\.googleapis\.com(:443)?\/css\?/v,
		sourceFile: /^https:\/\/pagead2\.googlesyndication\.com\//v,
	},
	{ effectiveDirective: 'style-src-elem', blockedURL: 'https://pwm-image.trendmicro.jp/5.8/extensionFrame/styles/engineV3.css' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'default' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'default2' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'dompurify' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'immersive-translate-sanitizer' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'lit-html' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'sanitizer' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: 'vue' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'chrome-extension', sample: '@azure/ms-rest-js#xml.browser' },
	{ effectiveDirective: 'trusted-types', blockedURL: 'trusted-types-policy', sourceFile: 'user-script', sample: 'dompurify' }, // iPad
	{ effectiveDirective: 'require-trusted-types-for', blockedURL: 'trusted-types-sink', sourceFile: 'chrome-extension' }, // Trend Micro ?
	{ effectiveDirective: 'require-trusted-types-for', blockedURL: 'trusted-types-sink', sample: 'Function|(\n) {\n\n})' }, // old Safari
	{ effectiveDirective: 'fenced-frame-src' },
];

export default {
	noticeFilter: noticeFilter,
};
