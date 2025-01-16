import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface headerValidator {
	contentType: 'application/csp-report';
}

export const headerValidator = validator('header', (value, context): headerValidator => {
	/* CORS */
	if (context.res.headers.get('Access-Control-Allow-Origin') === null) {
		throw new HTTPException(403, { message: 'Access from an unauthorized origin' });
	}

	const { 'content-type': contentType } = value;

	if (contentType !== 'application/csp-report') {
		throw new HTTPException(400, { message: 'The `Content-Type` request header is invalid' });
	}

	return {
		contentType,
	};
});
