import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { createDumpService, SapDump } from "./dump.js"
import { z } from "zod"
import { chapterNameType } from "./dumpparser.ts"
import { ServerNotificationSchema } from "@modelcontextprotocol/sdk/types.js"

const listdumpsdescription = `list sap short dumps generated when an ABAP program crashes
Each entry contains the ID of the dump, the error message, and the program that caused the dump.
You can use the "read_sap_dump_html" tool to read the unformatted html text of a dump by its ID. This is quite thorough, but not very specific.
You can also use the "read_sap_dump_sections" tool read a formatted summary of the dump which focuses on the most relevant information.`

const readhtmldumpsdescription = `read the html representation of a sap short dump\nThorough, but quite noisy`

const readsapdumpsectionsDesc = `Read a formatted summary of a sap short dump
This will return a summary of the dump, allowing to focus on the most relevant information.
Usually we will need to ask for sections: Short_Text,What_happened,What_can_you_do,Error_analysis,How_to_correct_the_error,Source_Code_Extract,Chosen_Variables,Active_Calls/Events
In particular Short_Text,What_happened,Source_Code_Extract,Active_Calls/Events should always be included. in any request
Other sections can be requested to add more context`

export const createServer = async (
  serverurl?: string,
  user?: string,
  password?: string,
  language?: string
) => {
  const service = await createDumpService(serverurl, user, password, language)
  const server = new McpServer({
    name: "sapdump-mcp-server",
    version: "1.0.0"
  })

  server.tool("list_sap_dumps", listdumpsdescription, async () => {
    const dumps = await service.listDumps(true)
    return {
      content: dumps.map(
        t =>
          ({
            type: "text",
            text: `ID: "${t.id}"\nTimestamp: ${t.timestamp}\nError: ${t.error}\nProgram: ${t.program}`
          } as const)
      )
    }
  })

  server.tool(
    "read_sap_dump_html",
    readhtmldumpsdescription,
    { id: z.string().describe("ID of the dump to read") },
    async ({ id }) => {
      const dump = await service.getHtmlDump(id)
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

  const dashline = `\n--------------------------------------------------------------------------------\n`

  server.tool(
    "read_sap_dump_sections",
    readsapdumpsectionsDesc,
    {
      id: z.string().describe("ID of the dump to read"),
      sections: z.array(chapterNameType)
    },
    async ({ id, sections }) => {
      const dump = await service.getDumpDetails(id)
      const relevant = sections
        .map(s => dump.chapters.get(s))
        .filter(s => typeof s !== "undefined")
        .map(c => `${c.title}:\n${c.text}`)
        .join(dashline)
      const header = `${dump.title}\n${dump.error} in program ${dump.terminatedProgram}${dashline}`
      return { content: [{ type: "text", text: `${header}${relevant}` }] }
    }
  )

  return server
}
