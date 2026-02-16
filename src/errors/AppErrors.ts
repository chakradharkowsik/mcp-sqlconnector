/**
 * Base class for all application errors.
 */
export class BaseError extends Error {
    constructor(
        public message: string,
        public code: string = 'INTERNAL_ERROR',
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Errors related to database operations.
 */
export class DatabaseError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'DATABASE_ERROR', 500, details);
    }
}

/**
 * Errors related to data validation or sanitization.
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

/**
 * Errors for when an object (table, view, etc.) is not found.
 */
export class NotFoundError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'NOT_FOUND', 404, details);
    }
}

/**
 * Errors related to server or service configuration.
 */
export class ConfigurationError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'CONFIGURATION_ERROR', 500, details);
    }
}
