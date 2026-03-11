// FILE: server/routes/project-routes.ts
import type { Express } from "express";
import fs from "fs";
import path from "path";
import { createProject, getProject, getAllProjects, deleteProject, addLogToProject, type ProjectOptions } from "../services/project-service";

export function registerProjectRoutes(app: Express) {
  app.get("/api/projects", (_req, res) => {
    const projects = getAllProjects();
    return res.json({
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        idea: p.idea,
        options: p.options,
        filesCount: p.files.length,
        logsCount: p.logs.length,
        createdAt: p.createdAt || p.logs[p.logs.length - 1]?.createdAt || new Date().toISOString(),
      }))
    });
  });

  app.delete("/api/project/:projectId", (req, res) => {
    const deleted = deleteProject(req.params.projectId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    return res.json({ success: true });
  });

  app.post("/api/project/start", (req, res) => {
    const idea = String(req.body?.idea || "").trim();

    if (!idea) {
      return res.status(400).json({
        success: false,
        message: "idea is required"
      });
    }

    const options: ProjectOptions = {
      tab: req.body?.tab,
      appType: req.body?.appType,
      tech: req.body?.tech,
      output: req.body?.output,
    };

    const project = createProject(idea, options);

    return res.status(201).json({
      success: true,
      projectId: project.id
    });
  });

  app.get("/api/project/:projectId", (req, res) => {
    const project = getProject(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const shouldAutoRun = !project.engineRan;
    if (shouldAutoRun) {
      project.engineRan = true;
    }

    return res.json({
      success: true,
      project: {
        id: project.id,
        idea: project.idea,
        options: project.options,
        autoRun: shouldAutoRun
      }
    });
  });

  app.get("/api/project/:projectId/logs", (req, res) => {
    const project = getProject(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    return res.json({
      success: true,
      logs: project.logs
    });
  });

  app.get("/api/project/:projectId/files", (req, res) => {
    const project = getProject(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const root = process.cwd();
    const ignore = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".upm", ".config", ".agents"]);

    const entries = fs.readdirSync(root, { withFileTypes: true });
    const files = entries
      .filter((e: any) => !ignore.has(e.name))
      .map((e: any) => ({
        id: e.name,
        name: e.name,
        path: e.name,
        type: e.isDirectory() ? "folder" : "file"
      }))
      .sort((a: any, b: any) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });

    return res.json({
      success: true,
      files
    });
  });

  app.get("/api/project/:projectId/preview", (req, res) => {
    const project = getProject(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    return res.json({
      success: true,
      html: project.previewHtml
    });
  });

  app.post("/api/project/:projectId/command", (req, res) => {
    const project = getProject(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const command = String(req.body?.command || "").trim();

    if (!command) {
      return res.status(400).json({
        success: false,
        message: "command is required"
      });
    }

    addLogToProject(req.params.projectId, command);

    return res.json({
      success: true
    });
  });
}