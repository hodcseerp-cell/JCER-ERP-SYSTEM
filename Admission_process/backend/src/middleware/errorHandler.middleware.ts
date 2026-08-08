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
  
  // Mask Sequelize / Database errors
  let message = err.message || 'Internal Server Error';
  let errorResponse: any = { error: message };

  if (!isOperational) {
    // If it's a Sequelize database error, sanitize the message
    if (err.name?.startsWith('Sequelize') || err.sql) {
      logger.error('Database query error:', {
        correlationId,
        message: err.message,
        sql: err.sql,
        parameters: err.parameters,
        stack: err.stack,
      });
      message = 'A database error occurred. Reference ID: ' + correlationId;
      errorResponse = { error: 'Internal Server Error', referenceId: correlationId };
    } else {
      // General unexpected errors
      logger.error('Unhandled runtime exception:', {
        correlationId,
        message: err.message,
        stack: err.stack,
      });
      message = 'An unexpected error occurred. Reference ID: ' + correlationId;
      errorResponse = { error: 'Internal Server Error', referenceId: correlationId };
    }
  } else {
    // Log operational exceptions as warning/info
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

  // Include detailed error messages and stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.details = (err as any).details || (err as any).errors || undefined;
    // For database/internal errors in dev, we can expose the actual message
    if (!isOperational) {
      errorResponse.error = err.message;
    }
  }

  res.status(status).json(errorResponse);
};
