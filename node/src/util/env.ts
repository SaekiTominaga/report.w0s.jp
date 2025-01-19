import { HTTPException } from 'hono/http-exception';

/**
 * `process.env` の値を取得する
 *
 * @param key - キー
 *
 * @returns 値
 */
export const env = (key: string): string => {
	const value = process.env[key];
	if (value === undefined) {
		throw new HTTPException(500, { message: `process.env["${key}"] not defined` });
	}

	return value;
};
