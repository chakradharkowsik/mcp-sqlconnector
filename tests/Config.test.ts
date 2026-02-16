import { describe, it, expect, beforeEach } from 'vitest';
import { config } from '../src/config.js';
import { DbDialect } from '../src/models/DatabaseModels.js';

describe('Config', () => {
    describe('environment variable parsing', () => {
        it('should have DB_TYPE defined', () => {
            expect(config.DB_TYPE).toBeDefined();
            expect([DbDialect.MSSQL, DbDialect.SQLITE]).toContain(config.DB_TYPE);
        });

        it('should have PORT defined', () => {
            expect(config.PORT).toBeDefined();
            expect(typeof config.PORT).toBe('number');
            expect(config.PORT).toBeGreaterThan(0);
        });

        it('should have DB_TRUST_SERVER_CERTIFICATE as boolean', () => {
            expect(typeof config.DB_TRUST_SERVER_CERTIFICATE).toBe('boolean');
        });
    });

    describe('MSSQL configuration', () => {
        it('should have MSSQL connection properties when DB_TYPE is mssql', () => {
            if (config.DB_TYPE === DbDialect.MSSQL) {
                expect(config.DB_USER).toBeDefined();
                expect(config.DB_PASSWORD).toBeDefined();
                expect(config.DB_SERVER).toBeDefined();
                expect(config.DB_NAME).toBeDefined();
            }
        });
    });

    describe('SQLite configuration', () => {
        it.skipIf(config.DB_TYPE !== DbDialect.SQLITE)('should have SQLite path when DB_TYPE is sqlite', () => {
            expect(config.DB_SQLITE_PATH).toBeDefined();
            expect(typeof config.DB_SQLITE_PATH).toBe('string');
        });
    });

    describe('configuration validation', () => {
        it('should have valid configuration object', () => {
            expect(config).toBeDefined();
            expect(typeof config).toBe('object');
        });

        it('should have all required properties', () => {
            expect(config).toHaveProperty('DB_TYPE');
            expect(config).toHaveProperty('PORT');
            expect(config).toHaveProperty('DB_TRUST_SERVER_CERTIFICATE');
        });
    });
});
