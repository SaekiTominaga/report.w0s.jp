import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestBody {
	location: string;
	referrer: string;
}

export default validator('json', (value: Record<string, unknown>, context): RequestBody => {
	if (context.res.headers.get('Access-Control-Allow-Origin') === null) {
		throw new HTTPException(403, { message: '`Access-Control-Allow-Origin` header does not exist' });
	}

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
