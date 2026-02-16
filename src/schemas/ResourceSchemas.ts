import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

/**
 * JSON Schemas for MCP Resources, derived from Zod where possible.
 */

// Schema for db://schema overview
export const SchemaOverviewResourceSchema = {
    type: "object",
    properties: {
        data: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    schema: { type: "string" },
                    table: { type: "string" },
                    column: { type: "string" },
                    type: { type: "string" },
                    nullable: { type: "string" }
                }
            }
        },
        page: { type: "number" },
        hasMore: { type: "boolean" },
        totalRows: { type: "number" }
    }
};

// Schema for db://tables/{name}/schema
export const TableSchemaResourceSchema = {
    type: "object",
    properties: {
        columns: { type: "array" },
        indexes: { type: "object" }
    }
};
