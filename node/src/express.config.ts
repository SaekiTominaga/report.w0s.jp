export default {
	response: {
		header: {
			hsts: 'max-age=31536000',
			csp: "frame-ancestors 'self'; report-uri https://w0sjp.report-uri.com/r/d/csp/enforce; report-to default",
			reportingEndpoints: {
				default: 'https://w0sjp.report-uri.com/a/d/g',
			},
		},
	},
	static: {
		root: 'public',
		extensions: ['.html'],
		indexes: ['index.html'],
		headers: {
			mimeType: {
				path: {
					'/favicon.ico': 'image/svg+xml;charset=utf-8',
				},
				extension: {
					'.png': 'image/png',
					'.html': 'text/html;charset=utf-8',
					'.txt': 'text/plain;charset=utf-8',
				},
			},
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
};
