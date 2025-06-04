import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import { createDumpService } from "./dump.js"

export const createServer = async () => {
  const service = await createDumpService()
  const server = new Server(
    {
      name: "sapdump-mcp-server",
      version: "1.0.0"
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  )

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "file://dumps",
          name: "Dumps",
          mimeType: "text/plain"
        }
      ]
    }
  })

  // Read resource contents
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const uri = request.params.uri
    if (uri === "file://dumps") {
      const dumps = await service.listDumps()
      const text = JSON.stringify(dumps)
      return {
        contents: [{ uri, mimeType: "text/plain", text }]
      }
    }
    throw new Error("Resource not found")
  })
  return server
}
