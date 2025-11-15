import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

interface RequestJson {
	documentURL: string;
	message: string;
	jsURL: string;
	lineNumber: number;
	columnNumber: number;
}

export const json = validator('json', (value: Readonly<Record<string, unknown>>): RequestJson => {
	const { documentURL, message, jsURL, lineNumber, columnNumber } = value;

	if (typeof documentURL !== 'string') {
		throw new HTTPException(400, { message: 'The `documentURL` parameter is invalid' });
	}
	if (typeof message !== 'string') {
		throw new HTTPException(400, { message: 'The `message` parameter is invalid' });
	}
	if (typeof jsURL !== 'string') {
		throw new HTTPException(400, { message: 'The `jsURL` parameter is invalid' });
	}
	if (typeof lineNumber !== 'number') {
		throw new HTTPException(400, { message: 'The `lineNumber` parameter is invalid' });
	}
	if (typeof columnNumber !== 'number') {
		throw new HTTPException(400, { message: 'The `columnNumber` parameter is invalid' });
	}

	return {
		documentURL,
		message,
		jsURL,
		lineNumber: lineNumber,
		columnNumber: columnNumber,
	};
});
