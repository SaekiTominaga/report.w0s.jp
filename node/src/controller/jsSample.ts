import { Hono } from 'hono';
import { cors as corsMiddleware } from '../middleware/cors.js';
import validator from '../validator/js.js';

/**
 * JavaScript エラー（サンプル）
 */
const app = new Hono().post('/', corsMiddleware).post('/', validator, () => new Response(null, { status: 204 }));

export default app;
