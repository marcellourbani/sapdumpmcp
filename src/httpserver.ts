import express from "express"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { v4 } from "uuid"
import { createServer } from "./mcpserver.js"

const transports: Map<string, StreamableHTTPServerTransport> = new Map()

export const createHttpServer = () => {
  const app = express()
  app.use(express.json())

  const getTransport = async (req: express.Request) => {
    const sessionId = req.headers["mcp-session-id"]
    const current = typeof sessionId === "string" && transports.get(sessionId)
    if (current) return current
    if (!isInitializeRequest(req.body))
      throw new Error("Invalid session ID or request body")

    const {
      "abap-server": serverurl,
      "abap-user": user,
      "abap-password": password,
      "abap-language": language
    } = req.headers
    const url = typeof serverurl === "string" ? serverurl : undefined
    const users = typeof user === "string" ? user : undefined
    const passwords = typeof password === "string" ? password : undefined
    const languages = typeof language === "string" ? language : undefined
    const server = await createServer(url, users, passwords, languages)

    const newTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => v4(),
      onsessioninitialized: sessionId => transports.set(sessionId, newTransport)
    })
    newTransport.onclose = () =>
      newTransport.sessionId && transports.delete(newTransport.sessionId)

    await server.connect(newTransport)

    return newTransport
  }

  app.post("/mcp", async (req, res) => {
    try {
      const transport = await getTransport(req)
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
  const port = process.env.PORT ?? 3000
  app.listen(port, () =>
    console.log(`SAP dump MCP server is running on port ${port}`)
  )
}
