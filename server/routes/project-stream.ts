// FILE: server/routes/project-stream.ts

import { Router } from "express";
import { addClient, removeClient } from "../services/project-stream";

export function registerProjectStreamRoutes(router: Router) {

  router.get("/api/projects/:projectId/stream", (req, res) => {

    const projectId = req.params.projectId;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    addClient(projectId, res);

    req.on("close", () => {
      removeClient(res);
    });

  });

}