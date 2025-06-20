import { createServer } from "./mcpserver.ts"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

export const createStdioServer = async () => {
  const server = await createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("SAP dump MCP server running on stdio")
}
