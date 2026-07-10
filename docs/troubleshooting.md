# Troubleshooting

## Common Issues

### Server crashes on startup
- **Error:** `JULES_API_KEY is not configured` (usually seen during the first request, not startup).
- **Fix:** Ensure you have created a `.env` file with `JULES_API_KEY` defined, or that the environment variable is set in your deployment platform.

### Database Persistence Failing
- **Error:** Logs show `Failed to persist session to Supabase`.
- **Fix:**
  1. Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct.
  2. Ensure the `jules_sessions` table exists in your Supabase database with the correct schema (columns: `task_id`, `session_id`, `title`, `prompt`, `status`, `attempts`, `repo`, `updated_at`).

### MCP Client Cannot Connect
- **Error:** Connection refused or 404.
- **Fix:** Ensure the MCP client is configured to hit the correct URL (e.g., `http://localhost:3000/mcp`) and that the server is running.

### Jules API Errors
- **Error:** `Jules create-session failed with HTTP 403` or similar.
- **Fix:** Your Jules API key may be invalid, expired, or lack permissions for the requested repository. Verify the `X-Goog-Api-Key` configuration.

## Debugging
You can use the `/debug/source-context` endpoint to ensure the server is parsing your GitHub repository strings correctly before they are sent to Jules.

For more details, see the [API Documentation](./api.md).
