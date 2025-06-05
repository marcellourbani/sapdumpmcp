import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { createDumpService, SapDump } from "./dump.js"
import { z } from "zod"
export const createServer = async () => {
  const service = await createDumpService()
  const server = new McpServer({
    name: "sapdump-mcp-server",
    version: "1.0.0"
  })

  server.tool(
    "list_sap_dumps",
    "list sap short dumps generated when a program crashes",
    async () => {
      const dumps = await service.listDumps(true)
      return {
        content: dumps.map(
          t =>
            ({
              type: "text",
              text: `ID:"${t.id}"\n:Error:${t.error}\nProgram:${t.program}`
            } as const)
        )
      }
    }
  )

  server.tool(
    "read_sap_dump",
    "read the text of a sap short dump",
    { id: z.string().describe("ID of the dump to read") },
    async ({ id }) => {
      const dump = await service.getDump(id)
      return {
        content: [
          {
            type: "resource",
            resource: { mimeType: "text/html", uri: dump.id, text: dump.text }
          }
        ]
      }
    }
  )

  return server
}
