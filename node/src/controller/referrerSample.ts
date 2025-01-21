import { Hono } from 'hono';
import { json as jsonValidator } from '../validator/referrer.js';

/**
 * リファラーエラー（サンプル）
 */
const app = new Hono().post('/', jsonValidator, () => new Response(null, { status: 204 }));

export default app;
