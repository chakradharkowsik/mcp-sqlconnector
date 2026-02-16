import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IDatabaseService } from "../interfaces/IDatabaseService.js";

import {
    SchemaOverviewResourceSchema,
    TableSchemaResourceSchema
} from "../schemas/ResourceSchemas.js";

import { wrapResourceHandler } from "../utils/McpHandlerWrapper.js";

export class ResourceService {
    constructor(private server: McpServer, private dbService: IDatabaseService) { }

    registerAll() {
        this.registerSchemaOverview();
        this.registerTableSchemaTemplate();
    }

    private registerSchemaOverview() {
        this.server.registerResource(
            "schema-overview",
            new ResourceTemplate("db://schema{?page}", { list: undefined }),
            {
                description: "Complete database schema overview (paginated)",
                annotations: { priority: 0.9 },
                schema: SchemaOverviewResourceSchema
            } as any,
            wrapResourceHandler(async (uri: any, { page }: any) => {
                const res = await this.dbService.getFullSchema();
                const pageSize = 100;
                const pageNum = parseInt(page as string || "1", 10);
                const start = (pageNum - 1) * pageSize;
                const end = start + pageSize;
                const paginatedData = res.recordset.slice(start, end);

                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify({
                            data: paginatedData,
                            page: pageNum,
                            hasMore: end < res.recordset.length,
                            totalRows: res.recordset.length
                        }, null, 2)
                    }]
                };
            })
        );
    }

    private registerTableSchemaTemplate() {
        this.server.registerResource(
            "table-schema",
            new ResourceTemplate("db://tables/{name}/schema", { list: undefined }),
            {
                description: "Schema definition for a specific table",
                annotations: { priority: 1.0 },
                schema: TableSchemaResourceSchema
            } as any,
            wrapResourceHandler(async (uri: any, { name }: any) => {
                const res = await this.dbService.getTableDefinition(name as string);
                if (!res) throw new Error(`Table not found: ${name}`);
                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(res.content, null, 2)
                    }],
                    metadata: {
                        table: name as string
                    }
                };
            })
        );
    }
}
