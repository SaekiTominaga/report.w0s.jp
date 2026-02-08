import { Hono } from 'hono';
import { json as jsonValidator } from '../validator/referrer.ts';

/**
 * リファラーエラー（サンプル）
 */
export const referrerSampleApp = new Hono().post(jsonValidator, () => new Response(null, { status: 204 }));
