import 'dotenv/config';
import { DatabaseService } from './services/DatabaseService.js';
import { SqliteDatabaseService } from './services/SqliteDatabaseService.js';
import { SqlMcpServer } from './services/SqlMcpServer.js';
import { IDatabaseService } from './interfaces/IDatabaseService.js';
import { config } from './config.js';
import { DbDialect } from './models/DatabaseModels.js';

/**
 * Entry Point - Composition Root
 */

// Orchestration
let dbService: IDatabaseService;

if (config.DB_TYPE === DbDialect.SQLITE) {
    console.error('Using SQLite Database Service');
    dbService = new SqliteDatabaseService(config.DB_SQLITE_PATH);
} else {
    console.error('Using MS SQL Database Service');
    const DB_CONFIG = {
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        server: config.DB_SERVER,
        database: config.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: config.DB_TRUST_SERVER_CERTIFICATE,
        },
    };
    dbService = new DatabaseService(DB_CONFIG);
}

const servers: SqlMcpServer[] = [];
const mode = process.argv[2] || 'both';
const port = config.PORT;

console.error(`Starting SQL MCP Server in mode: ${mode} on port ${port}`);

if (mode === 'sse' || mode === 'both') {
    const sseServer = new SqlMcpServer(dbService);
    sseServer.runSse(port).catch(err => {
        console.error('SSE Server error:', err);
        process.exit(1);
    });
    servers.push(sseServer);
}

if (mode === 'stdio' || mode === 'both') {
    const stdioServer = new SqlMcpServer(dbService);
    stdioServer.runStdio().catch(err => {
        console.error('Stdio Server error:', err);
        process.exit(1);
    });
    servers.push(stdioServer);
}

// Global Error Handlers
process.on('uncaughtException', async (error) => {
    console.error('CRITICAL: Uncaught Exception:', error);
    await shutdown();
});

process.on('unhandledRejection', async (reason) => {
    console.error('CRITICAL: Unhandled Rejection:', reason);
    await shutdown();
});

async function shutdown() {
    console.error("\n🛑 Shutting down SQL MCP Server...");
    for (const server of servers) {
        try {
            await server.closeServer();
        } catch (err) {
            console.error('Error closing server:', err);
        }
    }
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);