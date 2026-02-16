export enum DbDialect {
    MSSQL = 'mssql',
    SQLITE = 'sqlite'
}

export interface ColumnDefinition {
    COLUMN_NAME: string;
    DATA_TYPE: string;
    CHARACTER_MAXIMUM_LENGTH: number | null;
    IS_NULLABLE: string;
    IS_IDENTITY?: boolean;
}

export interface IndexDefinition {
    type: string;
    unique: boolean;
    primary_key: boolean;
    columns: string[];
}

export interface TableDefinition {
    columns: ColumnDefinition[];
    indexes: Record<string, IndexDefinition>;
}

export type DatabaseObjectDefinition =
    | { type: 'definition'; content: string }
    | { type: 'columns_and_indexes'; content: TableDefinition };

export interface DatabaseQueryResult {
    recordset: Array<Record<string, unknown>>;
}

export interface FullSchemaRow {
    schema: string;
    table: string;
    column: string;
    type: string;
    nullable: string;
}

