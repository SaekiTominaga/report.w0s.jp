export default {
	response: {
		header: {
			hsts: 'max-age=31536000',
			csp: {
				'default-src': ["'self'"],
				'frame-ancestors': ["'self'"],
				'report-uri': ['/report/csp'],
			},
			reportingEndpoints: {
				default: '/report/csp',
			},
		},
	},
	static: {
		root: 'public',
		index: 'index.html',
		extension: '.html', // URL 上で省略できる拡張子
		headers: {
			cacheControl: {
				default: 'max-age=600',
				path: [
					{
						paths: ['/favicon.ico'],
						value: 'max-age=604800',
					},
				],
				extension: [
					{
						extensions: ['.webp', '.jpg', '.jpeg', '.png', '.svg'],
						value: 'max-age=3600',
					},
				],
			},
		},
	},
	api: {
		dir: 'report', // API を示すディレクトリ
		allowMethods: ['POST'],
	},
};
