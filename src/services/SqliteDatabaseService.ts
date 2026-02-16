import Database from 'better-sqlite3';
import { IDatabaseService } from '../interfaces/IDatabaseService.js';
import { DatabaseQueryResult, DatabaseObjectDefinition } from '../models/DatabaseModels.js';
import { DatabaseError } from '../errors/AppErrors.js';
import { AuditLogger } from '../utils/AuditLogger.js';
import path from 'path';

export class SqliteDatabaseService implements IDatabaseService {
    private db: Database.Database;

    constructor(dbPath?: string) {
        try {
            const finalPath = dbPath || path.join(process.cwd(), 'test.db');
            this.db = new Database(finalPath);
        } catch (error: unknown) {
            throw new DatabaseError(`Failed to open SQLite database: ${error instanceof Error ? error.message : String(error)}`, error);
        }
    }

    async listTables(name?: string, schema: string = 'main'): Promise<DatabaseQueryResult> {
        try {
            let sql = "SELECT name, 'main' as [schema], 'table' as [type] FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'";
            const params: string[] = [];
            if (name) {
                sql += " AND name LIKE ?";
                params.push(`%${name}%`);
            }
            const tables = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
            return { recordset: tables };
        } catch (error: unknown) {
            throw new DatabaseError(`Failed to list SQLite tables: ${error instanceof Error ? error.message : String(error)}`, error);
        }
    }

    async listViews(name?: string, schema: string = 'main'): Promise<DatabaseQueryResult> {
        let sql = "SELECT name, 'main' as [schema], 'view' as [type] FROM sqlite_master WHERE type = 'view' AND name NOT LIKE 'sqlite_%'";
        const params: string[] = [];
        if (name) {
            sql += " AND name LIKE ?";
            params.push(`%${name}%`);
        }
        const views = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
        return { recordset: views };
    }

    async listFunctions(name?: string, schema: string = 'main'): Promise<DatabaseQueryResult> {
        // SQLite doesn't have native functions in sqlite_master like SPs
        return { recordset: [] };
    }

    async listProcedures(name?: string, schema: string = 'main'): Promise<DatabaseQueryResult> {
        // SQLite doesn't have native procedures
        return { recordset: [] };
    }

    async getTableDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        // Fetch columns using PRAGMA table_info
        // Safety: Table name must be escaped or validated. 
        // Since we don't have a built-in escape for identifiers in better-sqlite3, 
        // we use double quotes and escape any existing double quotes.
        const escapedName = `"${name.replace(/"/g, '""')}"`;
        const cols = this.db.prepare(`PRAGMA table_info(${escapedName})`).all() as { name: string, type: string, notnull: number, pk: number }[];

        if (cols.length === 0) return null;

        const columnDefinitions = cols.map(c => ({
            COLUMN_NAME: c.name,
            DATA_TYPE: c.type,
            CHARACTER_MAXIMUM_LENGTH: null,
            IS_NULLABLE: c.notnull ? 'NO' : 'YES',
            IS_IDENTITY: false // SQLite handled differently but for schema view we keep simple
        }));

        // Fetch indexes
        const indexList = this.db.prepare(`PRAGMA index_list(${escapedName})`).all() as { name: string, unique: number, origin: string }[];
        const indexMap: Record<string, any> = {};

        for (const idx of indexList) {
            const escapedIdxName = `"${idx.name.replace(/"/g, '""')}"`;
            const idxInfo = this.db.prepare(`PRAGMA index_info(${escapedIdxName})`).all() as { name: string }[];
            indexMap[idx.name] = {
                type: 'NON-CLUSTERED', // SQLite default
                unique: idx.unique === 1,
                primary_key: idx.origin === 'pk',
                columns: idxInfo.map(i => i.name)
            };
        }

        return {
            type: 'columns_and_indexes',
            content: {
                columns: columnDefinitions,
                indexes: indexMap
            }
        };
    }

    async getViewDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        const view = this.db.prepare("SELECT sql FROM sqlite_master WHERE type = 'view' AND name = ?").get(name) as { sql: string } | undefined;
        if (!view) return null;
        return { type: 'definition', content: view.sql };
    }

    async getFunctionDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        throw new Error(`Functions are not supported in SQLite schema discovery.`);
    }

    async getProcedureDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        throw new Error(`Stored procedures are not supported in SQLite.`);
    }

    async getFullSchema(): Promise<DatabaseQueryResult> {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
        const result: Record<string, unknown>[] = [];

        for (const table of tables) {
            const escapedName = `"${table.name.replace(/"/g, '""')}"`;
            const cols = this.db.prepare(`PRAGMA table_info(${escapedName})`).all() as { name: string, type: string, notnull: number }[];
            for (const col of cols) {
                result.push({
                    schema: 'main',
                    table: table.name,
                    column: col.name,
                    type: col.type,
                    nullable: col.notnull ? 'NO' : 'YES'
                });
            }
        }
        return { recordset: result };
    }

    async queryData(sqlQuery: string, params?: Record<string, any>): Promise<DatabaseQueryResult> {
        const startTime = Date.now();
        let success = false;
        let rowCount = 0;
        let error: string | undefined;

        try {
            // Remove NOLOCK for SQLite compatibility
            const sanitizedSql = sqlQuery.replace(/WITH\s*\(NOLOCK\)/gi, '');

            const stmt = this.db.prepare(sanitizedSql);
            const result = (params ? stmt.all(params) : stmt.all()) as Record<string, unknown>[];
            rowCount = result.length;
            success = true;

            return { recordset: result };
        } catch (err: unknown) {
            error = err instanceof Error ? err.message : String(err);
            throw new DatabaseError(`SQLite query execution failed: ${error}`, err);
        } finally {
            const executionTimeMs = Date.now() - startTime;
            AuditLogger.logQuery({
                type: 'query_execution',
                database: 'sqlite',
                sql: sqlQuery,
                params,
                executionTimeMs,
                success,
                error,
                rowCount
            });
        }
    }
    private isClosed = false;

    async close(): Promise<void> {
        if (!this.isClosed) {
            this.db.close();
            this.isClosed = true;
        }
    }
}
