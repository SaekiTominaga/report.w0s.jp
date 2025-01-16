import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface headerValidator {
	contentType: 'application/csp-report';
}

export const headerValidator = validator('header', (value): headerValidator => {
	const { 'content-type': contentType } = value;

	if (contentType !== 'application/csp-report') {
		throw new HTTPException(400, { message: 'The `Content-Type` request header is invalid' });
	}

	return {
		contentType,
	};
});
