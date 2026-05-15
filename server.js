import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

app.post("/create-session", async (req, res) => {
  try {

    const { prompt } = req.body;

    const response = await fetch(
      "https://jules.googleapis.com/v1alpha/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.JULES_API_KEY
        },
        body: JSON.stringify({
          prompt: prompt,
          sourceContext: {
            source: "sources/github/SpiffyNyanXD/wec-jules-server",
            githubRepoContext: {
              startingBranch: "main"
            }
          },
          automationMode: "AUTO_CREATE_PR",
          title: "Claude Task"
        })
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

app.get("/session/:id/events", async (req, res) => {

  try {

    const sessionId = req.params.id;

    const response = await fetch(
      `https://jules.googleapis.com/v1alpha/sessions/${sessionId}/events`,
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});