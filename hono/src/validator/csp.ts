import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

export type ContentType = 'application/reports+json' | 'application/csp-report';

interface RequestHeader {
	contentType: ContentType;
}

export const header = validator('header', (value): RequestHeader => {
	const { 'content-type': contentType } = value;

	if (contentType !== 'application/reports+json' && contentType !== 'application/csp-report') {
		throw new HTTPException(400, { message: 'The `Content-Type` request header is invalid' });
	}

	return {
		contentType,
	};
});
