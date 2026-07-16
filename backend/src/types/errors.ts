/**
 * Standard application error carrying an HTTP status and a machine-readable
 * error code. Thrown from route handlers / services and translated into the
 * `{ error: { code, message } }` shape by the centralized error middleware.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AppError";
  }
}
