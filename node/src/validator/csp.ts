import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestHeader {
	contentType: 'application/csp-report';
}

export const header = validator('header', (value): RequestHeader => {
	const { 'content-type': contentType } = value;

	if (contentType !== 'application/csp-report') {
		throw new HTTPException(400, { message: 'The `Content-Type` request header is invalid' });
	}

	return {
		contentType,
	};
});
