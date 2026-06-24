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

const parseJsonText = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const logSupabaseError = (operation, sessionId, error) => {
  console.error("Supabase write failed", {
    operation,
    sessionId,
    message: error.message,
    code: error.code
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
    const data = parseJsonText(text);

    if (!response.ok) {
      return res.status(response.status).json(data || { raw: text });
    }

    if (!data || !data.id) {
      return res.status(502).json({
        error: "Jules API response missing session ID"
      });
    }

    const { error } = await supabase
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

    if (error) {
      logSupabaseError("create-session insert", data.id, error);
      return res.status(500).json({
        error: "Failed to record session"
      });
    }

    res.status(response.status).json(data);

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

    const { error } = await supabase
      .from("jules_sessions")
      .update({
        status: data.state,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    if (error) {
      logSupabaseError("sync session update", sessionId, error);
      return res.status(500).json({
        error: "Failed to sync session"
      });
    }

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

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to continue session on Jules API",
        raw: text
      });
    }

    const { error } = await supabase
      .from("jules_sessions")
      .update({
        attempts: 2,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    if (error) {
      logSupabaseError("continue session update", sessionId, error);
      return res.status(500).json({
        error: "Failed to update session"
      });
    }

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
