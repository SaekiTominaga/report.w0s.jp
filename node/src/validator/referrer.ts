import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestJson {
	location: string;
	referrer: string;
}

export const json = validator('json', (value: Record<string, unknown>): RequestJson => {
	const { location, referrer } = value;

	if (typeof location !== 'string') {
		throw new HTTPException(400, { message: 'The `location` parameter is invalid' });
	}
	if (typeof referrer !== 'string') {
		throw new HTTPException(400, { message: 'The `referrer` parameter is invalid' });
	}

	return {
		location,
		referrer,
	};
});
