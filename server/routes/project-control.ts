// FILE: server/routes/project-control.ts

import { Router } from "express";
import { pauseProject, resumeProject } from "../services/project-control";

export function registerProjectControlRoutes(router: Router) {

  router.post("/api/projects/:projectId/pause", (req, res) => {

    pauseProject(req.params.projectId);

    res.json({ status: "paused" });

  });

  router.post("/api/projects/:projectId/resume", (req, res) => {

    resumeProject(req.params.projectId);

    res.json({ status: "running" });

  });

}