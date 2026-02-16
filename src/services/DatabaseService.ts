import mssql from 'mssql';
import { IDatabaseService } from '../interfaces/IDatabaseService.js';
import { DbDialect, ColumnDefinition, DatabaseQueryResult, DatabaseObjectDefinition, IndexDefinition, TableDefinition } from '../models/DatabaseModels.js';
import { DatabaseError } from '../errors/AppErrors.js';
import { AuditLogger } from '../utils/AuditLogger.js';

export class DatabaseService implements IDatabaseService {
    private pool: mssql.ConnectionPool | null = null;
    private config: mssql.config;

    constructor(config: mssql.config) {
        this.config = config;
    }

    private async getPool(): Promise<mssql.ConnectionPool> {
        try {
            if (!this.pool) {
                this.pool = await new mssql.ConnectionPool(this.config).connect();
            }
            return this.pool;
        } catch (error: unknown) {
            throw new DatabaseError(`Failed to connect to MSSQL: ${error instanceof Error ? error.message : String(error)}`, error);
        }
    }

    async listTables(name?: string, schema: string = 'dbo'): Promise<DatabaseQueryResult> {
        const pool = await this.getPool();
        const request = pool.request().input('schema', mssql.NVarChar, schema);
        let sql = `
            SELECT TABLE_NAME as [name], TABLE_SCHEMA as [schema], 'table' as [type]
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = @schema AND TABLE_TYPE = 'BASE TABLE'
        `;
        if (name) {
            request.input('name', mssql.NVarChar, `%${name}%`);
            sql += " AND TABLE_NAME LIKE @name";
        }
        sql += " ORDER BY TABLE_NAME";
        const res = await request.query(sql);
        return { recordset: res.recordset as Record<string, unknown>[] };
    }

    async listViews(name?: string, schema: string = 'dbo'): Promise<DatabaseQueryResult> {
        const pool = await this.getPool();
        const request = pool.request().input('schema', mssql.NVarChar, schema);
        let sql = `
            SELECT TABLE_NAME as [name], TABLE_SCHEMA as [schema], 'view' as [type]
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = @schema AND TABLE_TYPE = 'VIEW'
        `;
        if (name) {
            request.input('name', mssql.NVarChar, `%${name}%`);
            sql += " AND TABLE_NAME LIKE @name";
        }
        sql += " ORDER BY TABLE_NAME";
        const res = await request.query(sql);
        return { recordset: res.recordset as Record<string, unknown>[] };
    }

    async listFunctions(name?: string, schema: string = 'dbo'): Promise<DatabaseQueryResult> {
        const pool = await this.getPool();
        const request = pool.request().input('schema', mssql.NVarChar, schema);
        let sql = `
            SELECT ROUTINE_NAME as [name], ROUTINE_SCHEMA as [schema], 'function' as [type]
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = @schema AND ROUTINE_TYPE = 'FUNCTION'
        `;
        if (name) {
            request.input('name', mssql.NVarChar, `%${name}%`);
            sql += " AND ROUTINE_NAME LIKE @name";
        }
        sql += " ORDER BY ROUTINE_NAME";
        const res = await request.query(sql);
        return { recordset: res.recordset as Record<string, unknown>[] };
    }

    async listProcedures(name?: string, schema: string = 'dbo'): Promise<DatabaseQueryResult> {
        const pool = await this.getPool();
        const request = pool.request().input('schema', mssql.NVarChar, schema);
        let sql = `
            SELECT ROUTINE_NAME as [name], ROUTINE_SCHEMA as [schema], 'procedure' as [type]
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = @schema AND ROUTINE_TYPE = 'PROCEDURE'
        `;
        if (name) {
            request.input('name', mssql.NVarChar, `%${name}%`);
            sql += " AND ROUTINE_NAME LIKE @name";
        }
        sql += " ORDER BY ROUTINE_NAME";
        const res = await request.query(sql);
        return { recordset: res.recordset as Record<string, unknown>[] };
    }

    async getTableDefinition(name: string, explicitSchema?: string): Promise<DatabaseObjectDefinition | null> {
        const pool = await this.getPool();
        const { schema, name: objectName } = this.parseSchemaAndName(name, explicitSchema);

        // Fetch columns with identity info
        const columnRes = await pool.request()
            .input('schema', mssql.NVarChar, schema)
            .input('name', mssql.NVarChar, objectName)
            .query<ColumnDefinition>(`
                SELECT 
                    c.name AS COLUMN_NAME,
                    t.name AS DATA_TYPE,
                    c.max_length AS CHARACTER_MAXIMUM_LENGTH,
                    c.is_nullable AS IS_NULLABLE,
                    c.is_identity AS IS_IDENTITY
                FROM sys.columns c
                JOIN sys.objects o ON c.object_id = o.object_id
                JOIN sys.schemas s ON o.schema_id = s.schema_id
                JOIN sys.types t ON c.user_type_id = t.user_type_id
                WHERE s.name = @schema AND o.name = @name
                ORDER BY c.column_id
            `);

        if (!columnRes.recordset || columnRes.recordset.length === 0) {
            return null;
        }

        // Fetch indexes
        const indexRes = await pool.request()
            .input('schema', mssql.NVarChar, schema)
            .input('name', mssql.NVarChar, objectName)
            .query<{ index_name: string; index_type: string; is_unique: boolean; is_primary_key: boolean; column_name: string }>(`
                SELECT 
                    i.name AS index_name,
                    i.type_desc AS index_type,
                    i.is_unique,
                    i.is_primary_key,
                    COL_NAME(ic.object_id, ic.column_id) AS column_name
                FROM sys.indexes i
                JOIN sys.objects o ON i.object_id = o.object_id
                JOIN sys.schemas s ON i.schema_id = s.schema_id
                JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                WHERE s.name = @schema AND o.name = @name
                ORDER BY i.name, ic.key_ordinal
            `);

        // Group index columns
        const indexes: Record<string, IndexDefinition> = {};
        for (const row of indexRes.recordset) {
            if (!indexes[row.index_name]) {
                indexes[row.index_name] = {
                    type: row.index_type,
                    unique: row.is_unique,
                    primary_key: row.is_primary_key,
                    columns: []
                };
            }
            indexes[row.index_name].columns.push(row.column_name);
        }

        return {
            type: 'columns_and_indexes',
            content: {
                columns: columnRes.recordset,
                indexes
            }
        } as const;
    }

    private async getObjectDefinitionInternal(name: string, explicitSchema: string | undefined, type: 'VIEW' | 'FUNCTION' | 'PROCEDURE'): Promise<DatabaseObjectDefinition | null> {
        const pool = await this.getPool();
        const { schema, name: objectName } = this.parseSchemaAndName(name, explicitSchema);
        const fullName = `${schema}.${objectName}`;

        const res = await pool.request()
            .input('fullName', mssql.NVarChar, fullName)
            .query<{ definition: string }>(`SELECT OBJECT_DEFINITION(OBJECT_ID(@fullName)) AS [definition]`);

        if (res.recordset.length > 0 && res.recordset[0].definition) {
            return { type: 'definition', content: res.recordset[0].definition } as const;
        }

        return null;
    }

    async getViewDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        return await this.getObjectDefinitionInternal(name, schema, 'VIEW');
    }

    async getFunctionDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        return await this.getObjectDefinitionInternal(name, schema, 'FUNCTION');
    }

    async getProcedureDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null> {
        return await this.getObjectDefinitionInternal(name, schema, 'PROCEDURE');
    }

    private parseSchemaAndName(input: string, explicitSchema?: string): { schema: string; name: string } {
        if (explicitSchema) {
            return { schema: explicitSchema, name: input };
        }

        const parts = input.split('.');
        if (parts.length > 1) {
            return {
                schema: parts[0],
                name: parts.slice(1).join('.'),
            };
        }
        return {
            schema: 'dbo',
            name: input,
        };
    }

    async getFullSchema(): Promise<DatabaseQueryResult> {
        const pool = await this.getPool();
        const res = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA as [schema],
        TABLE_NAME as [table],
        COLUMN_NAME as [column],
        DATA_TYPE as [type],
        IS_NULLABLE as [nullable]
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);
        return { recordset: res.recordset as Record<string, unknown>[] };
    }

    async queryData(sqlQuery: string, params?: Record<string, any>): Promise<DatabaseQueryResult> {
        const startTime = Date.now();
        let success = false;
        let rowCount = 0;
        let error: string | undefined;

        try {
            const pool = await this.getPool();
            const request = pool.request();

            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    request.input(key, value);
                }
            }

            const res = await request.query(sqlQuery);
            rowCount = res.recordset.length;
            success = true;

            return { recordset: res.recordset as Record<string, unknown>[] };
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            throw err;
        } finally {
            const executionTimeMs = Date.now() - startTime;
            AuditLogger.logQuery({
                type: 'query_execution',
                database: 'mssql',
                sql: sqlQuery,
                params,
                executionTimeMs,
                success,
                error,
                rowCount
            });
        }
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
        }
    }
}
