import { Hono } from 'hono';
import { cors as corsMiddleware } from '../middleware/cors.js';
import { json as jsonValidator } from '../validator/referrer.js';

/**
 * リファラーエラー（サンプル）
 */
const app = new Hono().post('/', corsMiddleware, jsonValidator, () => new Response(null, { status: 204 }));

export default app;
