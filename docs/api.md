# REST API Documentation

The Jules MCP Server exposes several REST endpoints for manual interaction, health checking, and CI/CD integration, completely separate from the MCP JSON-RPC interface.

## Endpoints

### `GET /`
Returns basic server information, status, and default configuration.
**Response:**
```json
{
  "name": "Jules MCP Server",
  "status": "running",
  "mcpEndpoint": "/mcp",
  "defaultRepo": "owner/repo",
  "defaultBranch": "main"
}
```

### `GET /health`
Simple health check endpoint.
**Response:** `{"ok": true}`

### `GET /debug/source-context`
Returns the generated Jules source context object based on provided or default parameters. Useful for debugging Jules API payloads.
**Query Params:** `repo`, `branch`

### `POST /create-session`
Creates a new Jules task session.
**Body:**
```json
{
  "prompt": "Task instructions here",
  "repo": "owner/repo",
  "branch": "main",
  "title": "Optional Title",
  "automationMode": "AUTO_CREATE_PR"
}
```

### `GET /session/:id`
Retrieves the full details of an existing Jules session by its ID.
**Response:**
```json
{
  "id": "session_id",
  "title": "Task title",
  "state": "IN_PROGRESS",
  "url": "https://github.com/owner/repo/pull/1"
}
```

### `GET /session/:id/pr`
Retrieves only the PR state, URL, and title for a given session ID.
**Response:**
```json
{
  "state": "COMPLETED",
  "url": "https://github.com/owner/repo/pull/1",
  "title": "Task title"
}
```

### `GET /sync/:id`
Fetches the latest session state from Jules and updates the local Supabase database with the current status.
**Response:** `{"synced": true, "state": "COMPLETED"}`

### `POST /session/:id/continue`
Sends a follow-up prompt to an existing, active Jules session.
**Body:**
```json
{
  "prompt": "New instructions..."
}
```
**Response:**
```json
{
  "id": "session_id",
  "state": "IN_PROGRESS"
}
```

### `GET /mcp`
Returns MCP capability metadata. See [MCP Documentation](./mcp.md).

### `POST /mcp`
Endpoint for MCP JSON-RPC requests. See [MCP Documentation](./mcp.md).
