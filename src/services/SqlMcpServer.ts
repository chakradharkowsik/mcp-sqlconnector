import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import cors from 'cors';
import { ToolService } from './ToolService.js';
import { ResourceService } from './ResourceService.js';
import { PromptService } from './PromptService.js';
import { IDatabaseService } from '../interfaces/IDatabaseService.js';
import { uuid, ZodUUID } from "zod";
import { randomUUID } from "crypto";
import { config } from '../config.js';

export class SqlMcpServer {
    private server: McpServer;
    private dbService: IDatabaseService;
    private toolService: ToolService;
    private resourceService: ResourceService;
    private promptService: PromptService;

    constructor(dbService: IDatabaseService) {
        this.dbService = dbService;
        this.server = new McpServer({
            name: "sql-mcp-server",
            version: "1.0.0",
        });

        // Initialize and register all services via DI
        this.toolService = new ToolService(this.server, this.dbService, config);
        this.toolService.registerAll();

        this.resourceService = new ResourceService(this.server, this.dbService);
        this.resourceService.registerAll();

        this.promptService = new PromptService(this.server, this.dbService, config);
        this.promptService.registerAll();
    }

    async runStdio() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("SQL MCP server running on stdio");
    }

    async runSse(port: number = 3000) {
        const app = express();
        app.use(cors({
            origin: "*", // Or your specific client origin
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "X-MCP-Protocol-Version"]
        })).use((req, res, next) => {
            if (config.NODE_ENV === 'development') {
                console.error(`${req.method} request to: ${req.url}`);
            }
            next();
        });

        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID().toString()
        });

        await this.server.connect(transport);

        app.all("/mcp", async (req, res) => {
            if (config.NODE_ENV === 'development') {
                console.error(`[MCP HTTP] ${req.method} ${req.url}`);
            }
            await transport.handleRequest(req, res);
        });

        app.listen(port, () => {
            console.error(`SQL MCP server running on Streamable HTTP at http://localhost:${port}/mcp`);
        });
    }

    async closeServer() {
        await this.server.close();
        await this.dbService.close();
    }
}
