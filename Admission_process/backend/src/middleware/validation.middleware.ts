import { Request, Response, NextFunction } from 'express';
import { Schema as JoiSchema } from 'joi';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../utils/error.util';

/**
 * Request validation middleware supporting both Joi and Zod schemas.
 * Enforces type coercion, strips unknown properties to prevent mass assignment,
 * and throws a formatted BadRequestError with unified fields mapping if validation fails.
 * 
 * @param schema The Joi or Zod validation schema.
 * @param source The key on the request object to validate ('body', 'query', or 'params'). Defaults to 'body'.
 */
export const validateRequest = (schema: JoiSchema | ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check if it's a Zod schema
    if ('safeParse' in schema && typeof schema.safeParse === 'function') {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const fields: Record<string, string> = {};
        const details = result.error.issues.map((issue) => {
          const fieldPath = issue.path.join('.');
          fields[fieldPath] = issue.message;
          return {
            field: fieldPath,
            message: issue.message,
          };
        });

        const customError = new BadRequestError('Validation failed.');
        (customError as any).details = details;
        (customError as any).fields = fields;
        return next(customError);
      }

      // Replace with validated/coerced values
      req[source] = result.data;
      return next();
    } else {
      // Fallback to Joi validation
      const { error, value } = (schema as JoiSchema).validate(req[source], {
        abortEarly: false,     // Return all validation errors, not just the first
        stripUnknown: true,    // Remove unknown keys to block mass-assignment property injection
        allowUnknown: false,   // Fail validation if unknown keys are supplied
        convert: true,         // Attempt type coercion
      });

      if (error) {
        const fields: Record<string, string> = {};
        const details = error.details.map((detail) => {
          const fieldPath = detail.path.join('.');
          fields[fieldPath] = detail.message;
          return {
            field: fieldPath,
            message: detail.message,
          };
        });

        const customError = new BadRequestError('Validation failed.');
        (customError as any).details = details;
        (customError as any).fields = fields;
        return next(customError);
      }

      req[source] = value;
      return next();
    }
  };
};
