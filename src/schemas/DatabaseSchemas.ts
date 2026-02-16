import { z } from "zod";

/**
 * Zod schemas for database-related tool outputs to enable active validation and discovery metadata.
 */

export const ListingOutputSchema = z.array(z.object({
    name: z.string().describe("Name of the database object"),
    schema: z.string().describe("Schema of the object"),
    type: z.string().describe("Type of the object (table, view, etc.)")
}));

export const QueryOutputSchema = z.array(z.record(z.string(), z.unknown()));

export const TableOutputSchema = z.object({
    columns: z.array(z.unknown()),
    indexes: z.object({
        primaryKeys: z.array(z.unknown()).optional(),
        uniqueIndexes: z.array(z.unknown()).optional(),
        nonClusteredIndexes: z.array(z.unknown()).optional()
    }).optional()
});

export const ObjectDefinitionOutputSchema = z.string().describe("The SQL source code of the object");
