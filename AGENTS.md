# AGENTS.md

Welcome, AI Coding Agent (Claude, Codex, Jules, Gemini, Cursor, or others)! This file contains the foundational context, architecture, standards, and rules for the `jules-mcp-server` repository. Read this entirely before making any modifications.

## Project Overview

`jules-mcp-server` is an open-source Remote Model Context Protocol (MCP) Server for Google Jules. It enables LLM-driven coding agents to interact with Jules sessions via standard MCP over HTTP. It proxies requests to the Jules API and optionally persists session state in Supabase.

## Mission

To provide a robust, secure, and standard-compliant MCP interface to Google Jules, allowing seamless integration with various AI coding assistants and environments.

## Architecture

- **Runtime:** Node.js (ES Modules)
- **Web Framework:** Express.js
- **Protocol:** MCP (Model Context Protocol) over HTTP (JSON-RPC 2.0)
- **External APIs:** Google Jules API, Supabase (for optional session tracking)
- **State Management:** Stateless application server, with state pushed to Supabase if configured.

## Repository Structure

- `server.js`: The main entry point containing the Express server, MCP protocol handler, and Jules/Supabase API logic.
- `package.json`: Project dependencies and scripts.
- `.env` (not committed): Environment configuration.

## Development Setup

1. Node.js is required (v18+ recommended).
2. Run `npm install` to install dependencies (`express`, `dotenv`, `@supabase/supabase-js`).
3. Create a `.env` file based on the required environment variables.
4. Start the server using `npm start` or `node server.js`.

## Environment Variables

- `PORT`: The port the server runs on (defaults to 3000).
- `JULES_API_KEY`: Required. The API key for accessing Google Jules.
- `JULES_API_BASE`: The base URL for the Jules API (defaults to `https://jules.googleapis.com/v1alpha`).
- `GITHUB_REPO_OWNER`: Optional. Default GitHub organization or user for sessions (defaults to `SpiffyNyanXD`).
- `GITHUB_REPO_NAME`: Optional. Default GitHub repository name (defaults to `jules-mcp-server`).
- `GITHUB_REPO`: Optional. Default full repository name (defaults to `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`).
- `GITHUB_BRANCH`: Optional. Default branch for new coding sessions (defaults to `main`).
- `SUPABASE_URL`: Optional. Supabase project URL for session tracking.
- `SUPABASE_KEY`: Optional. Supabase anon/service key.

## Coding Standards

- **Language:** JavaScript (Node.js ES Modules).
- **Style:** Clean, readable, and concise. Use async/await for asynchronous operations.
- **Dependencies:** Keep dependencies to a minimum. Use native capabilities where possible.
- **No Build Steps:** Avoid adding unnecessary build steps (e.g., TypeScript compilation) unless explicitly approved.

## MCP Standards

- The server implements MCP over HTTP (GET /mcp and POST /mcp/messages).
- Ensure all responses conform to JSON-RPC 2.0 specifications.
- Support core MCP methods: `initialize`, `tools/list`, and `tools/call`.
- Maintain correct tool schema definitions.

## Jules API Standards

- Always pass the `X-Goog-Api-Key` header with the configured API key.
- Properly handle JSON payloads and response parsing.
- Forward Jules API errors gracefully to the client.

## Security Rules

- **Never** expose or log `JULES_API_KEY` or `SUPABASE_KEY`.
- Validate all incoming JSON-RPC requests.
- Handle malformed inputs safely without crashing the server.

## Logging Standards

- Use standard `console.log` for informational messages.
- Use `console.error` for errors and failures.
- Do not log sensitive payload data or environment variables.

## Error Handling Standards

- Catch all async errors and pass them to standard error handlers.
- Map internal errors to valid JSON-RPC 2.0 error codes (e.g., `-32600`, `-32601`, `-32000`).
- Return standard HTTP error statuses for non-MCP REST endpoints.

## Testing Requirements

- Verify MCP endpoints via standard HTTP clients (e.g., `curl` or Postman).
- Ensure new features do not break existing tool definitions (`tools/list`) or execution (`tools/call`).
- Run `npm start` to ensure the server boots without errors before committing.

## Pull Request Requirements

- Ensure code passes all basic runtime checks.
- Keep PRs focused on a single feature or fix.
- Include a descriptive title and summary of changes.

## Commit Message Standards

- Use conventional commits format: `type: description` (e.g., `feat: add new tool`, `fix: handle missing API key`, `docs: create comprehensive AGENTS.md`).
- Keep the subject line concise (max 50 characters).

## Repository Rules

- Do not modify `.gitignore` without a valid reason.
- Keep `server.js` monolithic for simplicity, unless a modular refactor is explicitly requested.

## Things Never To Change

- The MCP Protocol Version (`MCP-Protocol-Version` header).
- The JSON-RPC 2.0 response format.
- The core requirements for Jules API authentication.

## Roadmap

- Support for additional Jules automation modes.
- Enhanced telemetry and monitoring.
- Expanded MCP toolset for advanced session management.

## Agent Checklist

Before completing a task, verify the following:
- [ ] Have I adhered strictly to the requested changes?
- [ ] Have I avoided modifying unrelated files or code?
- [ ] Does the code run without errors (`node server.js`)?
- [ ] Are my commit messages following the required standards?
- [ ] Have I verified my work with read-only tools?
