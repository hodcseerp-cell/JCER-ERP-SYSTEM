export class HttpException extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends HttpException {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpException {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ForbiddenException extends ForbiddenError {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenException';
  }
}

export class NotFoundError extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends HttpException {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class InternalServerError extends HttpException {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}
