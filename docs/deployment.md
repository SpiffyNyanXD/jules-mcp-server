# Deployment

The Jules MCP Server is a standard Node.js Express application, making it suitable for deployment on various PaaS providers (Render, Heroku, Railway, Vercel etc.) or custom VPS instances.

## Prerequisites

- Node.js (v18+ recommended)
- A Supabase Project
- A Jules API Key

## Environment Variables

The server requires several environment variables to function correctly. These should be configured in your deployment environment or a local `.env` file.

| Variable | Description | Required | Default |
|---|---|---|---|
| `JULES_API_KEY` | Your Jules API Key used to authenticate with `jules.googleapis.com` | **Yes** | |
| `SUPABASE_URL` | Your Supabase project URL | **Yes** | |
| `SUPABASE_KEY` | Your Supabase anon or service role key | **Yes** | |
| `PORT` | The port the Express server will listen on | No | `3000` |
| `JULES_API_BASE` | Base URL for the Jules API | No | `https://jules.googleapis.com/v1alpha` |
| `GITHUB_REPO_OWNER` | Default GitHub repository owner | No | `SpiffyNyanXD` |
| `GITHUB_REPO_NAME` | Default GitHub repository name | No | `jules-mcp-server` |
| `GITHUB_REPO` | Full default repository (`owner/name`) | No | Derived from Owner/Name |
| `GITHUB_BRANCH` | Default repository branch | No | `main` |

## Local Execution

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on the required variables above.

3. Start the server:
   ```bash
   npm start
   ```
   The server will typically start on `http://localhost:3000`.

## Health Check
You can verify the deployment is running by pinging the root endpoint or the health endpoint:
- `GET /`
- `GET /health`

For more details, see [Troubleshooting](./troubleshooting.md).
