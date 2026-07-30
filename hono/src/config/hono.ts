export default {
	response: {
		header: {
			hsts: 'max-age=31536000',
			csp: {
				'frame-ancestors': ["'self'"],
				'report-uri': ['/report/csp'],
				'report-to': ['csp'],
			},
			reportingEndpoints: {
				csp: '/report/csp',
			},
		},
	},
	static: {
		root: 'public',
		index: 'index.html',
		extensions: ['.html'], // URL 上で省略できる拡張子
		headers: {
			contentType: {
				path: {
					'/favicon.ico': 'image/svg+xml; charset=utf-8',
				},
			},
			cacheControl: {
				default: 'max-age=600', // 10分
				path: [
					{
						paths: ['/favicon.ico'] as string[],
						value: 'max-age=604800', // 1週間
					},
				],
				extension: [
					{
						extensions: ['.avif', '.webp', '.jpg', '.jpeg', '.png', '.svg'] as string[],
						value: 'max-age=3600', // 1時間
					},
				],
			},
		},
	},
	api: {
		dir: 'report', // API を示すディレクトリ
		allowMethods: ['POST'] as string[],
	},
} as const;
