import { Request, Response, NextFunction } from 'express';

type Schema = {
    [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        required?: boolean;
        validator?: (value: any) => boolean;
    };
};

/**
 * Middleware for validating request body against a schema
 */
export const validateBody = (schema: Schema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: string[] = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // Check required fields
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`Field '${field}' is required`);
                continue;
            }

            // Skip validation if field is not required and not present
            if (!rules.required && (value === undefined || value === null)) {
                continue;
            }

            // Validate type
            switch (rules.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`Field '${field}' must be a string`);
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number') {
                        errors.push(`Field '${field}' must be a number`);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(`Field '${field}' must be a boolean`);
                    }
                    break;
                case 'object':
                    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                        errors.push(`Field '${field}' must be an object`);
                    }
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(`Field '${field}' must be an array`);
                    }
                    break;
            }

            // Custom validation
            if (rules.validator && !rules.validator(value)) {
                errors.push(`Field '${field}' failed custom validation`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        next();
    };
};
