import type { Context } from 'hono';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param context - Context
	 *
	 * @returns Response
	 */
	execute(context: Context): Promise<Response>;
}
