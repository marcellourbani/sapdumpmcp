# MCP server for SAP dumps

This will enable MCP clients to analyse SAP dumps.
Inspired by [mcp-windbg](https://github.com/svnscha/mcp-windbg), explained in [this blog](https://svnscha.de/posts/ai-meets-windbg/)

The idea is to enable AI tools to access dumps and ask details about them like description, call stack,...

Usually needs an [mcp.json](.vscode/mcp.json), whose format depends on the application