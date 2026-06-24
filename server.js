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

    const sourceContextId = payload.sourceContext?.source;
    const promptProvided = typeof prompt === "string" && prompt.length > 0;

    console.log(JSON.stringify({
      route: "POST /create-session",
      action: "create-session",
      automationMode: payload.automationMode,
      sourceContextId,
      promptProvided,
      promptLength: promptProvided ? prompt.length : 0
    }));

    const response = await fetch(
      "https://jules.googleapis.com/v1alpha/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.JULES_API_KEY
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

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/session/:id", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await fetch(
      `https://jules.googleapis.com/v1alpha/sessions/${sessionId}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.JULES_API_KEY
        }
      }
    );

    const data = await response.json();

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/session/:id/pr", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await fetch(
      `https://jules.googleapis.com/v1alpha/sessions/${sessionId}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.JULES_API_KEY
        }
      }
    );

    const data = await response.json();

    res.json({
      state: data.state,
      url: data.url,
      title: data.title
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/sync/:id", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await fetch(
      `https://jules.googleapis.com/v1alpha/sessions/${sessionId}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.JULES_API_KEY
        }
      }
    );

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

    res.status(500).json({
      error: err.message
    });

  }

});

app.post("/session/:id/continue", async (req, res) => {

  try {

    const sessionId = req.params.id;
    const { prompt } = req.body;

    const response = await fetch(
      `https://jules.googleapis.com/v1alpha/sessions/${sessionId}:reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.JULES_API_KEY
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

    res.status(500).json({
      error: err.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
