import { describe, it, expect } from 'vitest';
import { QuerySanitizer } from '../src/services/QuerySanitizer.js';
import { DbDialect } from '../src/models/DatabaseModels.js';

describe('QuerySanitizer', () => {
    describe('sanitize', () => {
        it('should allow valid SELECT statements', () => {
            const sql = 'SELECT * FROM users';
            expect(() => QuerySanitizer.sanitize(sql)).not.toThrow();
        });

        it('should allow WITH statements', () => {
            const sql = 'WITH cte AS (SELECT id FROM users) SELECT * FROM cte';
            expect(() => QuerySanitizer.sanitize(sql)).not.toThrow();
        });

        it('should reject UPDATE statements', () => {
            const sql = 'UPDATE users SET name = "test"';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow('Only SELECT or WITH statements are allowed');
        });

        it('should reject DELETE statements', () => {
            const sql = 'DELETE FROM users WHERE id = 1';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow('Only SELECT or WITH statements are allowed');
        });

        it('should reject DROP statements', () => {
            const sql = 'DROP TABLE users';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow('Only SELECT or WITH statements are allowed');
        });

        it('should reject multiple statements separated by semicolon', () => {
            const sql = 'SELECT * FROM users; DROP TABLE users';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow('Multiple statements are not allowed');
        });

        it('should allow trailing semicolon', () => {
            const sql = 'SELECT * FROM users;';
            expect(() => QuerySanitizer.sanitize(sql)).not.toThrow();
        });

        it('should reject forbidden keywords in SELECT body', () => {
            const sql = 'SELECT * FROM users WHERE name = "test"; UPDATE users SET active = 1';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow();
        });

        it('should reject EXEC statements', () => {
            const sql = 'SELECT * FROM users; EXEC sp_executesql';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow();
        });

        it('should reject MERGE statements', () => {
            const sql = 'MERGE INTO users USING source ON users.id = source.id';
            expect(() => QuerySanitizer.sanitize(sql)).toThrow();
        });
    });

    describe('applyConstraints', () => {
        it('should add TOP 100 to MSSQL SELECT without TOP', () => {
            const sql = 'SELECT * FROM users';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.MSSQL);
            expect(result).toContain('TOP 100');
        });

        it('should not add TOP if already present', () => {
            const sql = 'SELECT TOP 50 * FROM users';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.MSSQL);
            // Should not add another TOP, but will add WITH (NOLOCK)
            expect(result).toContain('TOP 50');
            expect(result).toContain('WITH (NOLOCK)');
            expect(result).not.toContain('TOP 100');
        });

        it('should add LIMIT 100 to SQLite SELECT without LIMIT', () => {
            const sql = 'SELECT * FROM users';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.SQLITE);
            expect(result).toContain('LIMIT 100');
        });

        it('should not add LIMIT if already present', () => {
            const sql = 'SELECT * FROM users LIMIT 50';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.SQLITE);
            expect(result).toBe(sql);
        });

        it('should add WITH (NOLOCK) to MSSQL queries', () => {
            const sql = 'SELECT * FROM users';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.MSSQL);
            expect(result).toContain('WITH (NOLOCK)');
        });

        it('should not add WITH (NOLOCK) if already present', () => {
            const sql = 'SELECT * FROM users WITH (NOLOCK)';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.MSSQL);
            expect(result.match(/WITH \(NOLOCK\)/g)?.length).toBe(1);
        });

        it('should handle SELECT DISTINCT correctly', () => {
            const sql = 'SELECT DISTINCT name FROM users';
            const result = QuerySanitizer.applyConstraints(sql, DbDialect.MSSQL);
            expect(result).toContain('SELECT DISTINCT TOP 100');
        });
    });
});
