export default {
	response: {
		header: {
			hsts: 'max-age=31536000',
		},
	},
	static: {
		root: 'public',
		index: 'index.html',
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
} as const;
