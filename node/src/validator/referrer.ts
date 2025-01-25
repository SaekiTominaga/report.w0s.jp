import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestJson {
	documentURL: string;
	referrer: string;
}

export const json = validator('json', (value: Record<string, unknown>): RequestJson => {
	const { documentURL, referrer } = value;

	if (typeof documentURL !== 'string') {
		throw new HTTPException(400, { message: 'The `documentURL` parameter is invalid' });
	}
	if (typeof referrer !== 'string') {
		throw new HTTPException(400, { message: 'The `referrer` parameter is invalid' });
	}

	return {
		documentURL,
		referrer,
	};
});
