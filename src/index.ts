import express from "express"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import {
  isInitializeRequest,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import { v4 } from "uuid"
import { createServer } from "./mcpserver.js"

const app = express()
app.use(express.json())

const transports: Map<string, StreamableHTTPServerTransport> = new Map()

const getTransport = async (sessionId: string, body: unknown) => {
  const current = transports.get(sessionId)
  if (current) return current
  if (!isInitializeRequest(body))
    throw new Error("Invalid session ID or request body")

  const newTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => v4(),
    onsessioninitialized: sessionId => transports.set(sessionId, newTransport)
  })
  newTransport.onclose = () =>
    newTransport.sessionId && transports.delete(newTransport.sessionId)

  const server = await createServer()
  await server.connect(newTransport)

  return newTransport
}

app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined
    const transport = await getTransport(sessionId || "", req.body)
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    console.error("Error handling MCP request:", error)
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided"
      },
      id: null
    })
  }
})
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers["mcp-session-id"]
  const transport = transports.get(`${sessionId}`)
  if (!transport) {
    res.status(400).send("Invalid or missing session ID")
    return
  }
  await transport.handleRequest(req, res)
}
app.get("/mcp", handleSessionRequest)
app.delete("/mcp", handleSessionRequest)
app.listen(3000, () => console.log("MCP server is running on port 3000"))
