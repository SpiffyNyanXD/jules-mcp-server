import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";


dotenv.config();

const app = express();

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

app.use(express.json({ limit: "1mb" }));

const JULES_API_BASE = process.env.JULES_API_BASE || "https://jules.googleapis.com/v1alpha";
const DEFAULT_REPO_OWNER = process.env.GITHUB_REPO_OWNER || "SpiffyNyanXD";
const DEFAULT_REPO_NAME = process.env.GITHUB_REPO_NAME || "jules-mcp-server";
const DEFAULT_REPO = process.env.GITHUB_REPO || `${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}`;
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || "main";
function getSourceContext(repo = DEFAULT_REPO, branch = DEFAULT_BRANCH) {
  const normalizedRepo = repo.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  const [owner, name] = normalizedRepo.split("/");

  if (!owner || !name) {
    throw new Error("Repository must be in owner/name format");
  }

  return {
    source: `sources/github/${owner}/${name}`,
    githubRepoContext: {
      startingBranch: branch
    }
  };
}

function requireJulesApiKey() {
  if (!process.env.JULES_API_KEY) {
    throw new Error("JULES_API_KEY is not configured");
  }
}

async function callJules(path, options = {}) {
  requireJulesApiKey();

  const response = await fetch(`${JULES_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.JULES_API_KEY,
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  return { response, data, raw };
}

async function persistSession({ data, prompt, repo, status = "IN_PROGRESS" }) {
  if (!supabase || !data?.id) {
    return;
  }

  const { error } = await supabase.from("jules_sessions").insert({
    task_id: crypto.randomUUID(),
    session_id: data.id,
    title: data.title,
    prompt,
    status,
    attempts: 1,
    repo
  });

  if (error) {
    console.error("Failed to persist session to Supabase:", error);
  }
}

async function createJulesSession({ prompt, repo = DEFAULT_REPO, branch = DEFAULT_BRANCH, title = "Jules MCP Task", automationMode = "AUTO_CREATE_PR" }) {
  const sourceContext = getSourceContext(repo, branch);
  const payload = {
    prompt,
    sourceContext,
    automationMode,
    title
  };

  console.log("Creating Jules session", JSON.stringify(payload, null, 2));

  const { response, data, raw } = await callJules("/sessions", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = new Error(`Jules create-session failed with HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    error.data = data;
    error.raw = raw;
    throw error;
  }

  await persistSession({ data, prompt, repo });

  return { data, payload };
}

async function getJulesSession(sessionId) {
  const { response, data, raw } = await callJules(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET"
  });

  if (!response.ok) {
    const error = new Error(`Jules session lookup failed with HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.raw = raw;
    throw error;
  }

  return data;
}

async function continueJulesSession({ sessionId, prompt }) {
  try {
    await getJulesSession(sessionId);
  } catch (err) {
    if (err.status === 404) {
      const notFoundError = new Error(`Jules session not found: ${sessionId}`);
      notFoundError.status = 404;
      throw notFoundError;
    }
    throw err;
  }
  const { response, data, raw } = await callJules(`/sessions/${encodeURIComponent(sessionId)}:reply`, {
    method: "POST",
    body: JSON.stringify({ prompt })
  });

  if (supabase) {
    await supabase
      .from("jules_sessions")
      .update({ attempts: 2, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId);
  }

  if (!response.ok) {
    const error = new Error(`Jules continue-session failed with HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.raw = raw;
    throw error;
  }

  return data;
}

function sendError(res, err) {
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status,
    details: err.data,
    requestPayload: err.payload
  });
}

app.get("/", (req, res) => {
  res.json({
    name: "Jules MCP Server",
    status: "running",
    mcpEndpoint: "/mcp",
    defaultRepo: DEFAULT_REPO,
    defaultBranch: DEFAULT_BRANCH
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/debug/source-context", (req, res) => {
  try {
    const repo = req.query.repo || DEFAULT_REPO;
    const branch = req.query.branch || DEFAULT_BRANCH;
    res.json({ repo, branch, sourceContext: getSourceContext(repo, branch) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post("/create-session", async (req, res) => {
  try {
    const { prompt, repo, branch, title, automationMode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await createJulesSession({ prompt, repo, branch, title, automationMode });
    res.json(result.data);
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/session/:id", async (req, res) => {
  try {
    res.json(await getJulesSession(req.params.id));
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/session/:id/pr", async (req, res) => {
  try {
    const data = await getJulesSession(req.params.id);
    res.json({ state: data.state, url: data.url, title: data.title });
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/sync/:id", async (req, res) => {
  try {
    const data = await getJulesSession(req.params.id);

    if (supabase) {
      await supabase
        .from("jules_sessions")
        .update({ status: data.state, updated_at: new Date().toISOString() })
        .eq("session_id", req.params.id);
    }

    res.json({ synced: true, state: data.state });
  } catch (err) {
    sendError(res, err);
  }
});

app.post("/session/:id/continue", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    res.json(await continueJulesSession({ sessionId: req.params.id, prompt }));
  } catch (err) {
    sendError(res, err);
  }
});

const tools = [
  {
    name: "create_jules_session",
    title: "Create Jules session",
    description: "Create a Jules coding session for a GitHub repository.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Task instructions for Jules." },
        repo: { type: "string", description: "GitHub repository in owner/name format. Defaults to server configuration." },
        branch: { type: "string", description: "Starting branch. Defaults to server configuration." },
        title: { type: "string", description: "Session title." },
        automationMode: { type: "string", description: "Jules automation mode.", default: "AUTO_CREATE_PR" }
      },
      required: ["prompt"]
    },
    annotations: { destructiveHint: false }
  },
  {
    name: "get_jules_session",
    title: "Get Jules session",
    description: "Fetch status and details for a Jules session.",
    inputSchema: {
      type: "object",
      properties: { sessionId: { type: "string" } },
      required: ["sessionId"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "continue_jules_session",
    title: "Continue Jules session",
    description: "Send an additional prompt to an existing Jules session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        prompt: { type: "string" }
      },
      required: ["sessionId", "prompt"]
    },
    annotations: { destructiveHint: false }
  },
  {
    name: "debug_source_context",
    title: "Debug Jules source context",
    description: "Return the exact Jules sourceContext derived from a repo and branch.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "GitHub repository in owner/name format." },
        branch: { type: "string", description: "Starting branch." }
      }
    },
    annotations: { readOnlyHint: true }
  }
];


function createMcpServer() {
  const server = new Server(
    {
      name: "jules-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_jules_session": {
          const result = await createJulesSession(args || {});
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }
        case "get_jules_session": {
          const result = await getJulesSession((args || {}).sessionId);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }
        case "continue_jules_session": {
          const result = await continueJulesSession(args || {});
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }
        case "debug_source_context": {
          const repo = (args || {}).repo || DEFAULT_REPO;
          const branch = (args || {}).branch || DEFAULT_BRANCH;
          const result = { repo, branch, sourceContext: getSourceContext(repo, branch) };
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message }
        ]
      };
    }
  });

  return server;
}


const transports = new Map();

app.get("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new SSEServerTransport("/mcp/messages", res);
  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post("/mcp/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(404).send("No active transport for session");
  }
});

app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
