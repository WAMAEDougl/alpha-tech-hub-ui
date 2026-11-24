// HTTP errors. Same names and JSON shape as the old NestJS API ({ message, error, statusCode }),
// so the services port over unchanged and the frontend keeps reading error messages the same way.

export class HttpError extends Error {
  constructor(public statusCode: number, public error: string, public messages: string[]) {
    super(messages.join(", "));
  }
  toJSON() {
    return { message: this.messages.length === 1 ? this.messages[0] : this.messages, error: this.error, statusCode: this.statusCode };
  }
}

const list = (m: string | string[]) => (Array.isArray(m) ? m : [m]);

export class BadRequestException extends HttpError { constructor(m: string | string[] = "Bad Request") { super(400, "Bad Request", list(m)); } }
export class UnauthorizedException extends HttpError { constructor(m: string | string[] = "Unauthorized") { super(401, "Unauthorized", list(m)); } }
export class ForbiddenException extends HttpError { constructor(m: string | string[] = "Forbidden") { super(403, "Forbidden", list(m)); } }
export class NotFoundException extends HttpError { constructor(m: string | string[] = "Not Found") { super(404, "Not Found", list(m)); } }
export class ConflictException extends HttpError { constructor(m: string | string[] = "Conflict") { super(409, "Conflict", list(m)); } }
export class TooManyRequestsException extends HttpError { constructor(m: string | string[] = "Too many requests") { super(429, "Too Many Requests", list(m)); } }

/** Minimal logger with the shape the services expect. Output goes to the Vercel function logs. */
export class Logger {
  constructor(private context: string) {}
  log(msg: string) { console.log(`[${this.context}] ${msg}`); }
  warn(msg: string) { console.warn(`[${this.context}] ${msg}`); }
  error(msg: string, err?: unknown) { console.error(`[${this.context}] ${msg}`, err ?? ""); }
}
