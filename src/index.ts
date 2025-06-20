#!/usr/bin/env node
import yargs from "yargs"
import { createStdioServer } from "./stdioserver.ts"
import { createHttpServer } from "./httpserver.ts"
import { errorMessage } from "./util.ts"

const main = async () => {
  const options = await yargs(process.argv.slice(2))
    .options({
      s: {
        type: "boolean",
        alias: "stdio",
        description: "Serve on standard input/output instead of http"
      }
    })
    .parse()
  try {
    if (options.s) await createStdioServer()
    else await createHttpServer()
  } catch (error) {
    console.error(`Failed to start SAP dump MCP server\n${errorMessage(error)}`)
    process.exit(1)
  }
}

main()
