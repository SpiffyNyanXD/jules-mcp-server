# Frequently Asked Questions

**Q: What is MCP?**
A: The Model Context Protocol (MCP) is an open standard that enables AI models to securely access local data and tools. This project acts as an MCP Server, providing tools to interact with the Jules AI.

**Q: Why do I need Supabase?**
A: Supabase is used to persist the state of Jules sessions (`jules_sessions` table). This allows you to track task attempts, status, and history across server restarts.

**Q: Does this server run Jules locally?**
A: No. This server is a bridge. It translates MCP tool calls into REST API requests sent to the remote Jules API (`jules.googleapis.com`).

**Q: Can I use this with any LLM?**
A: Yes, as long as the LLM interface (like Claude Desktop or Cursor) supports connecting to external MCP servers.

**Q: What if the Jules API is down?**
A: The server will pass through HTTP errors received from the Jules API. You can check the server logs or the JSON-RPC error response for details. See [Troubleshooting](./troubleshooting.md).
