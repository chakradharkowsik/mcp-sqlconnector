# MS SQL MCP Connector

A Model Context Protocol (MCP) server that provides tools for interacting with MS SQL Server.

## Features

- **list_tables_and_views**: List all tables and views.
- **list_routines**: List all stored procedures and functions.
- **search_objects**: Fuzzy search across all schema objects.
- **get_object_definition**: Fetch the SQL definition for routines or column info for tables.
- **query_data**: Secure SELECT-only tool.
  - Automatically enforces `TOP 100`.
  - Automatically injects `WITH (NOLOCK)`.
  - Blocks DML/DDL (UPDATE, DELETE, etc.).
  - Supports parameterized queries.

## Resources

- **db://schema**: Complete database schema overview as JSON.
- **db://tables/{name}/schema**: Schema definition for a specific table.

## Prompts

- **analyze-table**: Analyze a table schema and suggest usage patterns.
- **query-assistant**: Get assistance in writing a T-SQL query based on the database schema.

## LangChain Integration

This project is fully compatible with **LangChain**. You can consume these tools in a LangChain agent using the `@langchain/mcp-adapters` package.

### Stdio Transport (Local)
```typescript
import { McpTool } from "@langchain/mcp-adapters";

const tools = await McpTool.fromServer({
  name: "sql-server",
  stdio: {
    command: "node",
    args: ["dist/index.js", "stdio"],
    env: process.env // Ensure DB_ credentials are set
  }
});
```

### Streamable HTTP Transport (SSE)
```typescript
const tools = await McpTool.fromServer({
  name: "sql-server",
  sse: {
    url: "http://localhost:3000/mcp"
  }
});
```

See [examples/langchain.ts](file:///d:/Projects/mcp/sqlconnector/examples/langchain.ts) for a full implementation.

## Architecture

This project follows **SRP (Single Responsibility Principle)**:
- `DatabaseService`: Handles all MS SQL database interactions.
- `QuerySanitizer`: Encapsulates security logic and query rewriting (NOLOCK, TOP 100).
- `index.ts`: MCP Server orchestration and transport management.

## Transport Modes

### 1. Stdio (Local/CLI)
Default mode used by most MCP clients (e.g., Claude Desktop, MCP Inspector).
```bash
npm start stdio
```

### 2. Streamable HTTP (SSE)
Exposes the MCP server over HTTP using the modern `StreamableHTTPServerTransport`.
```bash
npm start sse
```
- **Port**: Configurable via `PORT` environment variable (defaults to 3000).
- **Endpoint**:
  - `ANY /mcp`: Handles both SSE (GET) and MCP messages (POST).

## Setup

### Prerequisites
- Node.js installed.
- Access to an MS SQL Server instance.

### Configuration
Set the following environment variables:
- `DB_USER`: Database username.
- `DB_PASSWORD`: Database password.
- `DB_SERVER`: Server hostname/IP (defaults to `localhost`).
- `DB_NAME`: Database name.
- `PORT`: (Optional) Port for SSE mode.

### Installation
```bash
npm install
npm run build
```

### Running with MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Security
- The `query_data` tool is strictly limited to `SELECT` statements.
- Parameters are supported and recommended to prevent SQL injection.
- Multiple statements (`;`) are blocked.
