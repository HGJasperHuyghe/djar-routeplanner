import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { AppError } from "../types/errors";

/**
 * Centralized error handler. Translates thrown errors into the contract's
 * `{ error: { code, message } }` shape. AppError instances carry their own
 * status/code; anything else is treated as an unexpected 500.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: err instanceof Error ? err.message : "Unexpected server error",
    },
  });
};

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `No route for ${req.method} ${req.path}`,
    },
  });
}
