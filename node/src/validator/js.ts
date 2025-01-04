import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestBody {
	location: string;
	message: string;
	filename: string;
	lineno: number;
	colno: number;
}

export default validator('json', (value: Record<string, unknown>, context): RequestBody => {
	if (context.res.headers.get('Access-Control-Allow-Origin') === null) {
		throw new HTTPException(403, { message: '`Access-Control-Allow-Origin` header does not exist' });
	}

	const { location, message, filename, lineno, colno } = value;

	if (typeof location !== 'string') {
		throw new HTTPException(400, { message: 'The `location` parameter is invalid' });
	}
	if (typeof message !== 'string') {
		throw new HTTPException(400, { message: 'The `message` parameter is invalid' });
	}
	if (typeof filename !== 'string') {
		throw new HTTPException(400, { message: 'The `filename` parameter is invalid' });
	}
	if (typeof lineno !== 'string' && typeof lineno !== 'number') {
		throw new HTTPException(400, { message: 'The `lineno` parameter is invalid' });
	}
	if (typeof colno !== 'string' && typeof colno !== 'number') {
		throw new HTTPException(400, { message: 'The `colno` parameter is invalid' });
	}

	return {
		location,
		message,
		filename,
		lineno: Number(lineno),
		colno: Number(colno),
	};
});
