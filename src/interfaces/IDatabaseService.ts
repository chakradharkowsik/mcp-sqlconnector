import { DatabaseObjectDefinition, DatabaseQueryResult } from '../models/DatabaseModels.js';

export interface IDatabaseService {
    listTables(name?: string, schema?: string): Promise<DatabaseQueryResult>;
    listViews(name?: string, schema?: string): Promise<DatabaseQueryResult>;
    listFunctions(name?: string, schema?: string): Promise<DatabaseQueryResult>;
    listProcedures(name?: string, schema?: string): Promise<DatabaseQueryResult>;

    getTableDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null>;
    getViewDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null>;
    getFunctionDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null>;
    getProcedureDefinition(name: string, schema?: string): Promise<DatabaseObjectDefinition | null>;

    getFullSchema(): Promise<DatabaseQueryResult>;
    queryData(sqlQuery: string, params?: Record<string, any>): Promise<DatabaseQueryResult>;
    close(): Promise<void>;
}
