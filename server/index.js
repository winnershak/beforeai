import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "BlissAlarm Token Server" });
});

// This creates ephemeral keys for WebRTC connection
app.post("/realtime/token", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: "shimmer",
        instructions: "You are a warm, calming sleep companion. Speak soothingly to help users relax and fall asleep. Keep responses natural and conversational."
      })
    });

    const data = await response.json();
    res.json({ client_secret: data.client_secret });
  } catch (error) {
    console.error("Token error:", error);
    res.status(500).json({ error: String(error) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
