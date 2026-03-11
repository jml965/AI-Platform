// FILE: server/routes/file-content.ts

import { Router } from "express";
import { readFileSafe } from "../services/file-reader";

export function registerFileContentRoutes(router: Router) {

  router.get("/api/projects/:projectId/file", (req, res) => {

    const base = process.cwd();
    const path = req.query.path as string;

    const content = readFileSafe(base, path);

    res.json({ content });

  });

}