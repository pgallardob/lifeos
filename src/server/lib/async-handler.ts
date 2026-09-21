import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Envuelve un handler async para que Express 4 capture los rechazos
 * de promesa y los pase al middleware de errores con next(err).
 */
export function ah(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
