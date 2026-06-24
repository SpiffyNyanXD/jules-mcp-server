import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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
const MCP_PROTOCOL_VERSION = "2025-06-18";

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

  await supabase.from("jules_sessions").insert({
    task_id: crypto.randomUUID(),
    session_id: data.id,
    title: data.title,
    prompt,
    status,
    attempts: 1,
    repo
  });
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

async function callMcpTool(name, args = {}) {
  switch (name) {
    case "create_jules_session": {
      const result = await createJulesSession(args);
      return result;
    }
    case "get_jules_session": {
      return await getJulesSession(args.sessionId);
    }
    case "continue_jules_session": {
      return await continueJulesSession(args);
    }
    case "debug_source_context": {
      const repo = args.repo || DEFAULT_REPO;
      const branch = args.branch || DEFAULT_BRANCH;
      return { repo, branch, sourceContext: getSourceContext(repo, branch) };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

async function handleMcpRequest(message) {
  if (!message || message.jsonrpc !== "2.0") {
    return jsonRpcError(message?.id ?? null, -32600, "Invalid JSON-RPC request");
  }

  if (message.method?.startsWith("notifications/")) {
    return null;
  }

  switch (message.method) {
    case "initialize":
      return jsonRpcResult(message.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "jules-mcp-server", version: "1.0.0" }
      });
    case "tools/list":
      return jsonRpcResult(message.id, { tools });
    case "tools/call": {
      const { name, arguments: args } = message.params || {};
      const result = await callMcpTool(name, args || {});
      return jsonRpcResult(message.id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      });
    }
    default:
      return jsonRpcError(message.id, -32601, `Method not found: ${message.method}`);
  }
}

app.get("/mcp", (req, res) => {
  res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION);
  res.json({
    name: "jules-mcp-server",
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: "streamable-http",
    methods: ["initialize", "tools/list", "tools/call"]
  });
});

app.post("/mcp", async (req, res) => {
  res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION);
  res.setHeader("Content-Type", "application/json");

  try {
    const body = req.body;
    const responses = Array.isArray(body)
      ? (await Promise.all(body.map(handleMcpRequest))).filter(Boolean)
      : await handleMcpRequest(body);

    if (!responses || (Array.isArray(responses) && responses.length === 0)) {
      return res.status(202).end();
    }

    res.json(responses);
  } catch (err) {
    res.json(jsonRpcError(req.body?.id ?? null, -32000, err.message, {
      status: err.status,
      details: err.data,
      requestPayload: err.payload
    }));
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
