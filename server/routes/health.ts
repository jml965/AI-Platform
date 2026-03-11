// FILE: server/routes/health.ts
import type { Express } from "express";

export function registerHealthRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}