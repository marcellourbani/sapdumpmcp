# MCP server for SAP dumps

This will enable MCP clients to analyse SAP dumps.
Inspired by [mcp-windbg](https://github.com/svnscha/mcp-windbg), explained in [this blog](https://svnscha.de/posts/ai-meets-windbg/)

The idea is to enable AI tools to access dumps and ask details about them like description, call stack,...

Usually needs an [mcp.json](.vscode/mcp.json), whose format depends on the application. This is for visual studio code

## Testing

Running the *develop* launch configuration will:

* start the *dev* job - will serve the mcp server on port 3000 and restart it on code changes
* start the *inspect* job - will start an mcp inspector on port 6274, with a proxy on 6277
* start the debugger

you can test the server by connecting to the [mcp inspector](http://127.0.0.1:6274) and select transport type **Streamable HTTP** and URL **[http://localhost:3000/mcp](http://localhost:3000/mcp)**

Will only work if your .env file points to a valid server

## Vscode/Github copilot

The mcp.json linked above works for visual studio code as long as:

* mcp is enabled (currently only available in preview)
* the *dev* job is running

To start the server you can use the command palette or the codelens on the mcp.json file:
![mcp.json](media/mcp_json.png)
