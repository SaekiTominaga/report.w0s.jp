import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestBody {
	location: string;
	referrer: string;
}

export default validator('json', (value: Record<string, unknown>): RequestBody => {
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
