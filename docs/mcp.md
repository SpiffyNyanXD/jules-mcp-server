# Model Context Protocol (MCP)

This server acts as a Remote MCP Server. It communicates using JSON-RPC 2.0 over HTTP endpoints.

## Implementation Details
- **Protocol Version:** `2025-06-18`
- **Transport:** `streamable-http` (Though currently implemented via standard HTTP POST)
- **Supported Methods:** `initialize`, `tools/list`, `tools/call`

## Endpoint
All MCP interactions occur via the `POST /mcp` endpoint.

## Available Tools

The server exposes the following tools to the MCP client (and subsequently to the LLM agent):

### `create_jules_session`
Creates a new Jules coding session for a specified GitHub repository.
- **Input:**
  - `prompt` (string, required): Task instructions for Jules.
  - `repo` (string, optional): GitHub repository in `owner/name` format.
  - `branch` (string, optional): Starting branch.
  - `title` (string, optional): Session title.
  - `automationMode` (string, optional): Automation mode, defaults to `AUTO_CREATE_PR`.

### `get_jules_session`
Fetches the status and details for an existing Jules session.
- **Input:**
  - `sessionId` (string, required): The ID of the session.

### `continue_jules_session`
Sends an additional prompt/instruction to an existing Jules session.
- **Input:**
  - `sessionId` (string, required): The ID of the session.
  - `prompt` (string, required): The follow-up instructions.

### `debug_source_context`
Returns the exact Jules `sourceContext` object derived from a repository and branch. Primarily used for debugging.
- **Input:**
  - `repo` (string, optional)
  - `branch` (string, optional)

For architectural details, see [Architecture](./architecture.md).
