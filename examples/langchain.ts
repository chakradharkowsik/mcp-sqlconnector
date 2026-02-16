import { McpTool } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";

/**
 * Example: Integrating MS SQL MCP Server with LangChain
 * 
 * Transport Choices:
 * 1. Stdio (Local Process)
 * 2. SSE (Remote/Web Server)
 */

async function runLangChainExample() {
    // 1. Initialize MCP Tools
    // Replace with your server's transport configuration
    const tools = await McpTool.fromServer({
        name: "sql-mcp-server",
        // Choice A: Stdio
        stdio: {
            command: "node",
            args: ["dist/index.js", "stdio"],
            env: {
                DB_USER: "...",
                DB_PASSWORD: "...",
                // ... other env vars
            }
        },
        // Choice B: SSE
        // sse: {
        //   url: "http://localhost:3000/mcp",
        // }
    });

    // 2. Setup LLM
    const llm = new ChatOpenAI({ modelName: "gpt-4-turbo" });

    // 3. Create Agent
    const prompt = await pull("hwchase17/openai-functions-agent");
    const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({ agent, tools });

    // 4. Run!
    const result = await executor.invoke({
        input: "Explain the schema of the 'Customers' table and list the top 5 customers.",
    });

    console.log(result.output);
}

runLangChainExample().catch(console.error);
