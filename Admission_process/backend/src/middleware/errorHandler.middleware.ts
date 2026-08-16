import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../utils/error.util';
import logger from '../utils/logger.util';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const correlationId = (req as any).correlationId || 'N/A';
  const status = err.status || 500;
  
  // Identify if it's a known operational exception
  const isOperational = err instanceof HttpException;

  // Detect raw Sequelize / DB errors that expose SQL internals — these must be sanitized
  const isSequelizeError = err.name?.startsWith('Sequelize') || !!err.sql;

  let message = err.message || 'Internal Server Error';
  let errorResponse: any = { error: message };

  if (isSequelizeError) {
    // Sanitize Sequelize DB errors — never expose SQL queries or table names
    logger.error('Database query error:', {
      correlationId,
      message: err.message,
      sql: err.sql,
      parameters: err.parameters,
      stack: err.stack,
    });
    errorResponse = { error: 'A database error occurred. Please try again.', referenceId: correlationId };
  } else if (!isOperational) {
    // Plain Error thrown from controller business logic — safe to expose message
    logger.error('Controller error:', {
      correlationId,
      message: err.message,
      stack: err.stack,
    });
    // Expose the actual error message (e.g. "USN already claimed", "Not found")
    errorResponse = { error: message };
  } else {
    // Log operational HttpException as warning/info
    logger.warn(`Operational HTTP Exception [${status}]: ${message}`, {
      correlationId,
      path: req.path,
      method: req.method,
    });
    errorResponse = { 
      error: message,
      fields: (err as any).fields || undefined
    };
  }

  // Include stack trace in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.details = (err as any).details || (err as any).errors || undefined;
  }

  res.status(status).json(errorResponse);
};

