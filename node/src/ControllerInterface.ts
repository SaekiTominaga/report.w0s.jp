import type { Request, Response } from 'express';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param req - Request
	 * @param res - Response
	 */
	execute(req: Request, res: Response): Promise<void>;
}
