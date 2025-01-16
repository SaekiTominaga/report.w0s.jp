import { Hono } from 'hono';
import { cors as corsMiddleware } from '../middleware/cors.js';
import validator from '../validator/referrer.js';

/**
 * リファラーエラー（サンプル）
 */
const app = new Hono().post('/', corsMiddleware).post('/', validator, () => new Response(null, { status: 204 }));

export default app;
