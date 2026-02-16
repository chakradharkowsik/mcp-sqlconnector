import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IDatabaseService } from "../interfaces/IDatabaseService.js";
import { QuerySanitizer } from "./QuerySanitizer.js";
import { Config } from '../config.js';

import { wrapToolHandler } from "../utils/McpHandlerWrapper.js";

export class ToolService {
    constructor(private server: McpServer, private dbService: IDatabaseService, private config: Config) { }

    registerAll() {
        this.registerListingTools();
        this.registerTableSchemaTool();
        this.registerDefinitionTools();
        this.registerQueryData();
    }

    private registerListingTools() {
        const types = [
            { name: "tables", method: "listTables", desc: "List database tables. Use this to discover core data structures and entities." },
            { name: "views", method: "listViews", desc: "List database views. Use this to find virtual tables that represent complex queries or simplified data models." },
            { name: "functions", method: "listFunctions", desc: "List user-defined functions. Use this to find reusable logic and calculations that return values." },
            { name: "procedures", method: "listProcedures", desc: "List stored procedures. Use this to discover batch operations, complex logic, and maintenance scripts." },
        ] as const;

        for (const { name, method, desc } of types) {
            this.server.registerTool(
                `list_${name}`,
                {
                    description: `${desc} Supports fuzzy search by name and filtering by schema.`,
                    inputSchema: z.object({
                        name: z.string().optional().describe(`Search term for ${name} (fuzzy name match)`),
                        schema: z.string().optional().describe("Database schema (default: 'dbo')"),
                    }),
                } as any,
                wrapToolHandler(async (args: any) => {
                    const res = await this.dbService[method](args.name, args.schema);
                    if (res.recordset.length === 0) {
                        const searchInfo = args.name ? ` matching '${args.name}'` : "";
                        const schemaInfo = args.schema ? ` in schema '${args.schema}'` : "";
                        return {
                            content: [{ type: "text", text: `No ${name} found${searchInfo}${schemaInfo}.` }]
                        };
                    }
                    return {
                        content: [{ type: "text", text: JSON.stringify(res.recordset, null, 2) }]
                    };
                })
            );
        }
    }

    private registerTableSchemaTool() {
        this.server.registerTool(
            "get_table_definition",
            {
                description: "Get detailed schema for a table, including columns, data types, nullability, auto-increment/identity info, and all indexes (Primary Keys, Unique, and Non-Clustered). Requires an exact name match.",
                inputSchema: z.object({
                    name: z.string().describe("Exact name of the table to retrieve"),
                    schema: z.string().optional().describe("Schema of the object (default: 'dbo')"),
                }),
            } as any,
            wrapToolHandler(async (args: any) => {
                const res = await this.dbService.getTableDefinition(args.name, args.schema);
                if (!res) {
                    return {
                        content: [{ type: "text", text: `Table not found: ${args.name}` }],
                        isError: true
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(res.content, null, 2) }]
                };
            })
        );
    }

    private registerDefinitionTools() {
        const types = [
            { name: "view", method: "getViewDefinition", desc: "Get the SQL logic/definition behind a view." },
            { name: "function", method: "getFunctionDefinition", desc: "Get the SQL code/implementation of a user-defined function." },
            { name: "procedure", method: "getProcedureDefinition", desc: "Get the full SQL code/body of a stored procedure." },
        ] as const;

        for (const { name, method, desc } of types) {
            this.server.registerTool(
                `get_${name}_definition`,
                {
                    description: `${desc} Requires an exact name match.`,
                    inputSchema: z.object({
                        name: z.string().describe(`Exact name of the ${name} to retrieve`),
                        schema: z.string().optional().describe("Schema of the object (default: 'dbo')"),
                    }),
                } as any,
                wrapToolHandler(async (args: any) => {
                    const res = await this.dbService[method](args.name, args.schema);
                    if (!res) {
                        return {
                            content: [{ type: "text", text: `${name} not found: ${args.name}` }],
                            isError: true
                        };
                    }
                    return {
                        content: [{ type: "text", text: res.content as string }]
                    };
                })
            );
        }
    }

    private registerQueryData() {
        this.server.registerTool(
            "query_data",
            {
                description: "Execute a read-only SELECT query. RESTRICTIONS: Automatically adds TOP 100 limit, includes WITH(NOLOCK) where applicable, and blocks DML/DDL (INSERT, UPDATE, DELETE, DROP, etc.). Use @paramName for secure parameterized queries.",
                inputSchema: z.object({
                    sql: z.string().describe("The SELECT statement"),
                    parameters: z.record(z.string(), z.unknown()).optional().describe("Optional parameters (@key: value)"),
                }),
            } as any,
            wrapToolHandler(async (args: any) => {
                const sanitized = QuerySanitizer.sanitize(args.sql);
                const dialect = this.config.DB_TYPE;
                const finalSql = QuerySanitizer.applyConstraints(sanitized, dialect);
                const res = await this.dbService.queryData(finalSql, args.parameters);
                if (res.recordset.length === 0) {
                    return {
                        content: [{ type: "text", text: "Query executed successfully, but returned no results." }]
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(res.recordset, null, 2) }]
                };
            })
        );
    }
}
