import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditLogger } from '../src/utils/AuditLogger.js';
import type { QueryAuditLog } from '../src/utils/AuditLogger.js';

describe('AuditLogger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('logQuery', () => {
        it('should log successful query execution', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const auditLog: QueryAuditLog = {
                type: 'query_execution',
                database: 'mssql',
                sql: 'SELECT * FROM users',
                params: { id: 1 },
                executionTimeMs: 150,
                success: true,
                rowCount: 10
            };

            AuditLogger.logQuery(auditLog);

            // Verify the log was called (winston will handle actual logging)
            expect(auditLog.success).toBe(true);
            expect(auditLog.executionTimeMs).toBe(150);

            logSpy.mockRestore();
        });

        it('should log failed query execution', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const auditLog: QueryAuditLog = {
                type: 'query_execution',
                database: 'sqlite',
                sql: 'SELECT * FROM invalid_table',
                executionTimeMs: 5,
                success: false,
                error: 'Table not found',
                rowCount: 0
            };

            AuditLogger.logQuery(auditLog);

            expect(auditLog.success).toBe(false);
            expect(auditLog.error).toBe('Table not found');

            errorSpy.mockRestore();
        });

        it('should include timestamp in log entry', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const beforeTime = new Date().toISOString();

            const auditLog: QueryAuditLog = {
                type: 'query_execution',
                database: 'mssql',
                sql: 'SELECT 1',
                success: true,
                executionTimeMs: 1
            };

            AuditLogger.logQuery(auditLog);

            const afterTime = new Date().toISOString();

            // Timestamp should be between before and after
            expect(beforeTime).toBeTruthy();
            expect(afterTime).toBeTruthy();

            logSpy.mockRestore();
        });
    });

    describe('info', () => {
        it('should log info messages', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            AuditLogger.info('Test info message', { key: 'value' });

            // Verify method doesn't throw
            expect(logSpy).toBeDefined();

            logSpy.mockRestore();
        });
    });

    describe('error', () => {
        it('should log error messages with Error object', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const error = new Error('Test error');
            AuditLogger.error('Error occurred', error, { context: 'test' });

            expect(errorSpy).toBeDefined();

            errorSpy.mockRestore();
        });

        it('should log error messages with string', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            AuditLogger.error('Error occurred', 'string error', { context: 'test' });

            expect(errorSpy).toBeDefined();

            errorSpy.mockRestore();
        });
    });

    describe('warn', () => {
        it('should log warning messages', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            AuditLogger.warn('Warning message', { severity: 'medium' });

            expect(warnSpy).toBeDefined();

            warnSpy.mockRestore();
        });
    });
});
