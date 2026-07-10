# Roadmap

Future enhancements planned for the Jules MCP Server:

## Short Term
- **Input Validation:** Implement robust input validation using a library like Joi or Zod for both REST and MCP requests.
- **Error Handling:** Centralize error formatting and provide clearer HTTP status codes for upstream Jules API failures.
- **Logging:** Replace `console.log` with a structured logging framework (e.g., Winston or Pino).

## Medium Term
- **Webhooks:** Add support for Jules webhooks to update the Supabase state asynchronously, rather than relying on manual `/sync/:id` polling.
- **Authentication:** Add API Key or JWT authentication to protect the REST endpoints and the MCP endpoint from unauthorized access.
- **True SSE:** Upgrade the `/mcp` transport to fully support Server-Sent Events (SSE) as defined by the MCP specification, rather than standard HTTP POST.

## Long Term
- **Multi-Tenant Support:** Allow the server to handle multiple different Jules API keys and Supabase instances based on user context.
- **Dashboard:** Provide a simple frontend dashboard to view session history and status stored in Supabase.
