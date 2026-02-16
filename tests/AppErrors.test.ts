import { describe, it, expect } from 'vitest';
import { BaseError, DatabaseError, ValidationError, NotFoundError, ConfigurationError } from '../src/errors/AppErrors.js';

describe('AppErrors', () => {
    describe('BaseError', () => {
        it('should create a base error with message and code', () => {
            const error = new BaseError('Test error', 'TEST_ERROR');
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe('BaseError');
        });

        it('should accept custom status code', () => {
            const error = new BaseError('Test error', 'TEST_ERROR', 400);
            expect(error.statusCode).toBe(400);
        });

        it('should accept details object', () => {
            const details = { field: 'username', value: 'test' };
            const error = new BaseError('Test error', 'TEST_ERROR', 500, details);
            expect(error.details).toEqual(details);
        });
    });

    describe('DatabaseError', () => {
        it('should create a database error', () => {
            const error = new DatabaseError('Connection failed');
            expect(error.message).toBe('Connection failed');
            expect(error.code).toBe('DATABASE_ERROR');
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe('DatabaseError');
        });

        it('should accept original error', () => {
            const originalError = new Error('Original error');
            const error = new DatabaseError('Connection failed', originalError);
            expect(error.details).toBe(originalError);
        });
    });

    describe('ValidationError', () => {
        it('should create a validation error', () => {
            const error = new ValidationError('Invalid input');
            expect(error.message).toBe('Invalid input');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('ValidationError');
        });

        it('should accept validation details', () => {
            const details = { field: 'email', reason: 'invalid format' };
            const error = new ValidationError('Invalid email', details);
            expect(error.details).toEqual(details);
        });
    });

    describe('NotFoundError', () => {
        it('should create a not found error', () => {
            const error = new NotFoundError('Resource not found');
            expect(error.message).toBe('Resource not found');
            expect(error.code).toBe('NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('NotFoundError');
        });
    });

    describe('ConfigurationError', () => {
        it('should create a configuration error', () => {
            const error = new ConfigurationError('Missing DB_HOST');
            expect(error.message).toBe('Missing DB_HOST');
            expect(error.code).toBe('CONFIGURATION_ERROR');
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe('ConfigurationError');
        });
    });

    describe('Error inheritance', () => {
        it('should be instances of Error', () => {
            expect(new DatabaseError('test')).toBeInstanceOf(Error);
            expect(new ValidationError('test')).toBeInstanceOf(Error);
            expect(new NotFoundError('test')).toBeInstanceOf(Error);
            expect(new ConfigurationError('test')).toBeInstanceOf(Error);
        });

        it('should be instances of BaseError', () => {
            expect(new DatabaseError('test')).toBeInstanceOf(BaseError);
            expect(new ValidationError('test')).toBeInstanceOf(BaseError);
            expect(new NotFoundError('test')).toBeInstanceOf(BaseError);
            expect(new ConfigurationError('test')).toBeInstanceOf(BaseError);
        });
    });
});
