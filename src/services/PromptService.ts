import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IDatabaseService } from "../interfaces/IDatabaseService.js";
import { Config } from "../config.js";
import { DbDialect } from "../models/DatabaseModels.js";

import { wrapPromptHandler } from "../utils/McpHandlerWrapper.js";

export class PromptService {
    constructor(private server: McpServer, private dbService: IDatabaseService, private config: Config) { }

    registerAll() {
        this.registerAnalyzeTable();
        this.registerQueryAssistant();
    }

    private registerAnalyzeTable() {
        const defaultSchema = this.config.DB_TYPE === DbDialect.SQLITE ? 'main' : 'dbo';
        this.server.registerPrompt(
            "analyze-table",
            {
                description: `Analyze a table schema and suggest usage patterns. Defaults to '${defaultSchema}' schema.`,
                argsSchema: {
                    tableName: z.string().describe("Name of the table to analyze"),
                    schema: z.string().optional().describe(`Schema of the table (defaults to '${defaultSchema}')`),
                },
            },
            wrapPromptHandler(async ({ tableName, schema }: { tableName: string; schema?: string }) => {
                const targetSchema = schema || defaultSchema;
                const definition = await this.dbService.getTableDefinition(tableName, targetSchema);
                const schemaText = definition ? JSON.stringify(definition.content, null, 2) : "Unknown schema";

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: `Please analyze the following table schema for "${targetSchema}.${tableName}" and suggest common query patterns, indexing strategies, and potential data integrity considerations:\n\n${schemaText}`
                            }
                        }
                    ]
                };
            })
        );
    }

    private registerQueryAssistant() {
        this.server.registerPrompt(
            "query-assistant",
            {
                description: "Get assistance in writing a SQL query for the current database",
                argsSchema: {
                    topic: z.string().describe("The business question or data you want to retrieve"),
                    schema: z.string().optional().describe("Optional schema to focus on"),
                },
            },
            wrapPromptHandler(async ({ topic, schema }: { topic: string; schema?: string }) => {
                const dbSchema = await this.dbService.getFullSchema();
                let records = dbSchema.recordset;
                if (schema) {
                    const targetSchema = schema.toLowerCase();
                    records = records.filter(r => String(r.schema).toLowerCase() === targetSchema);
                }

                const schemaSummary = JSON.stringify(records.slice(0, 50), null, 2);
                const dbDialect = this.config.DB_TYPE === DbDialect.SQLITE ? 'SQLite' : 'T-SQL';
                const restrictionText = this.config.DB_TYPE === DbDialect.MSSQL ? ' using WITH(NOLOCK)' : '';

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: `I need to write a ${dbDialect} query for the following topic: "${topic}". Focus on the ${schema || 'available'} schema. Here is a summary of the tables and columns:\n\n${schemaSummary}\n\nPlease suggest a secure SELECT statement${restrictionText}.`
                            }
                        }
                    ]
                };
            })
        );
    }
}
