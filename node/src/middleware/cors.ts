import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export const cors = createMiddleware(async (context, next) => {
	if (context.res.headers.get('Access-Control-Allow-Origin') === null) {
		throw new HTTPException(403, { message: 'Access from an unauthorized origin' });
	}

	await next();
});
