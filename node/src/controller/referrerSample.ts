import { Hono } from 'hono';
import { json as jsonValidator } from '../validator/referrer.js';

/**
 * リファラーエラー（サンプル）
 */
export const referrerSample = new Hono().post(jsonValidator, () => new Response(null, { status: 204 }));
