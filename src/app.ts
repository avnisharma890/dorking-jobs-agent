import express from "express";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "ai-internship-agent",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}