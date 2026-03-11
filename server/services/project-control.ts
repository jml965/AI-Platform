// FILE: server/services/project-control.ts

type ProjectStatus = "running" | "paused" | "completed";

const projectState: Record<string, ProjectStatus> = {};

export function setProjectRunning(id: string) {
  projectState[id] = "running";
}

export function pauseProject(id: string) {
  projectState[id] = "paused";
}

export function resumeProject(id: string) {
  projectState[id] = "running";
}

export function getProjectStatus(id: string) {
  return projectState[id] || "running";
}