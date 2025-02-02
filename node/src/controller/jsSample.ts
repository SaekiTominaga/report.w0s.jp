import { Hono } from 'hono';
import { json as jsonValidator } from '../validator/js.js';

/**
 * JavaScript エラー（サンプル）
 */
export const jsSampleApp = new Hono().post(jsonValidator, () => new Response(null, { status: 204 }));
