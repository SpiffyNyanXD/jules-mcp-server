import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());

const JULES_API_BASE_URL = "https://jules.googleapis.com/v1alpha";
const JULES_API_TIMEOUT_MS = Number(process.env.JULES_API_TIMEOUT_MS) || 30000;

class JulesApiTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Jules API request timed out after ${timeoutMs}ms`);
    this.name = "JulesApiTimeoutError";
  }
}

const isAbortError = (err) =>
  err?.name === "AbortError" || err?.code === "ABORT_ERR";

const julesFetch = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JULES_API_TIMEOUT_MS);

  try {
    return await fetch(`${JULES_API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "X-Goog-Api-Key": process.env.JULES_API_KEY,
        ...options.headers
      },
      signal: controller.signal
    });
  } catch (err) {
    if (isAbortError(err)) {
      throw new JulesApiTimeoutError(JULES_API_TIMEOUT_MS);
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

const handleRouteError = (res, err) => {
  if (err instanceof JulesApiTimeoutError) {
    return res.status(504).json({
      error: err.message
    });
  }

  return res.status(500).json({
    error: err.message
  });
};


app.get("/", (req, res) => {
  res.send("Server running");
});

app.post("/create-session", async (req, res) => {

  try {

    const { prompt } = req.body;

    const payload = {
      prompt: prompt,
      sourceContext: {
        source: "sources/github/SpiffyNyanXD/jules-mcp-server",
        githubRepoContext: {
          startingBranch: "main"
        }
      },
      automationMode: "AUTO_CREATE_PR",
      title: "Jules MCP Task"
    };

    console.log(JSON.stringify(payload, null, 2));

    const response = await julesFetch(
      "/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();

    return res.json({
      status: response.status,
      raw: text
    });

    await supabase
      .from("jules_sessions")
      .insert({
        task_id: crypto.randomUUID(),
        session_id: data.id,
        title: data.title,
        prompt: prompt,
        status: "IN_PROGRESS",
        attempts: 1,
        repo: "SpiffyNyanXD/wec-pitwall"
      });

    res.json(data);

  } catch (err) {

    handleRouteError(res, err);

  }

});

app.get("/session/:id", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await julesFetch(`/sessions/${sessionId}`);

    const data = await response.json();

    res.json(data);

  } catch (err) {

    handleRouteError(res, err);

  }

});

app.get("/session/:id/pr", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await julesFetch(`/sessions/${sessionId}`);

    const data = await response.json();

    res.json({
      state: data.state,
      url: data.url,
      title: data.title
    });

  } catch (err) {

    handleRouteError(res, err);

  }

});

app.get("/sync/:id", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await julesFetch(`/sessions/${sessionId}`);

    const data = await response.json();

    await supabase
      .from("jules_sessions")
      .update({
        status: data.state,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    res.json({
      synced: true,
      state: data.state
    });

  } catch (err) {

    handleRouteError(res, err);

  }

});

app.post("/session/:id/continue", async (req, res) => {

  try {

    const sessionId = req.params.id;
    const { prompt } = req.body;

    const response = await julesFetch(
      `/sessions/${sessionId}:reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt
        })
      }
    );

    const text = await response.text();

    await supabase
      .from("jules_sessions")
      .update({
        attempts: 2,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    res.json({
      raw: text,
      status: response.status
    });

  } catch (err) {

    handleRouteError(res, err);

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
