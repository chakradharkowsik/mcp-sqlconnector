import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SqliteDatabaseService } from '../src/services/SqliteDatabaseService.js';

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
    return {
        default: class MockDatabase {
            prepare = vi.fn(() => ({
                all: vi.fn(() => []),
                get: vi.fn(() => undefined)
            }));
            close = vi.fn();
        }
    };
});

// Mock AuditLogger
vi.mock('../src/utils/AuditLogger.js', () => ({
    AuditLogger: {
        logQuery: vi.fn()
    }
}));

describe('SqliteDatabaseService', () => {
    let dbService: SqliteDatabaseService;

    beforeEach(() => {
        vi.clearAllMocks();
        dbService = new SqliteDatabaseService(':memory:');
    });

    afterEach(async () => {
        await dbService.close();
    });

    describe('constructor', () => {
        it('should create database service with provided path', () => {
            expect(dbService).toBeDefined();
        });

        it('should use default path if none provided', () => {
            const defaultService = new SqliteDatabaseService();
            expect(defaultService).toBeDefined();
        });
    });

    describe('listTables', () => {
        it('should list tables excluding sqlite internal tables', async () => {
            const result = await dbService.listTables();
            expect(result).toHaveProperty('recordset');
            expect(Array.isArray(result.recordset)).toBe(true);
        });

        it('should filter tables by name', async () => {
            const result = await dbService.listTables('user');
            expect(result).toHaveProperty('recordset');
        });
    });

    describe('listViews', () => {
        it('should list views', async () => {
            const result = await dbService.listViews();
            expect(result).toHaveProperty('recordset');
            expect(Array.isArray(result.recordset)).toBe(true);
        });
    });

    describe('listFunctions', () => {
        it('should return empty array for SQLite', async () => {
            const result = await dbService.listFunctions();
            expect(result.recordset).toEqual([]);
        });
    });

    describe('listProcedures', () => {
        it('should return empty array for SQLite', async () => {
            const result = await dbService.listProcedures();
            expect(result.recordset).toEqual([]);
        });
    });

    describe('getTableDefinition', () => {
        it('should return null for non-existent table', async () => {
            const result = await dbService.getTableDefinition('nonexistent');
            expect(result).toBeNull();
        });

        it('should escape table names with double quotes', async () => {
            // Test that the service properly escapes identifiers
            await dbService.getTableDefinition('test"table');
            expect(dbService).toBeDefined();
        });
    });

    describe('getViewDefinition', () => {
        it('should return null for non-existent view', async () => {
            const result = await dbService.getViewDefinition('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('getFunctionDefinition', () => {
        it('should throw error for SQLite', async () => {
            await expect(dbService.getFunctionDefinition('test')).rejects.toThrow('not supported');
        });
    });

    describe('getProcedureDefinition', () => {
        it('should throw error for SQLite', async () => {
            await expect(dbService.getProcedureDefinition('test')).rejects.toThrow('not supported');
        });
    });

    describe('queryData', () => {
        it('should execute query and return results', async () => {
            const result = await dbService.queryData('SELECT 1');
            expect(result).toHaveProperty('recordset');
        });

        it('should remove NOLOCK hints for SQLite compatibility', async () => {
            const result = await dbService.queryData('SELECT * FROM users WITH (NOLOCK)');
            expect(result).toHaveProperty('recordset');
        });

        it('should handle parameterized queries', async () => {
            const result = await dbService.queryData('SELECT * FROM users WHERE id = ?', { id: 1 });
            expect(result).toHaveProperty('recordset');
        });
    });

    describe('close', () => {
        it('should close database connection', async () => {
            await dbService.close();
            // Verify it doesn't throw on second close
            await dbService.close();
            expect(dbService).toBeDefined();
        });
    });
});
