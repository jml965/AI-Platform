// FILE: client/src/lib/api.ts
const API_BASE = "/api";

export interface ProjectOptions {
  tab?: string;
  appType?: string;
  tech?: string;
  output?: string;
}

export async function startProject(idea: string, options?: ProjectOptions) {
  const response = await fetch(`${API_BASE}/project/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ idea, ...options })
  });

  if (!response.ok) {
    throw new Error("Failed to start project");
  }

  return response.json();
}

export async function getProject(projectId: string) {
  const response = await fetch(`${API_BASE}/project/${projectId}`);

  if (!response.ok) {
    throw new Error("Failed to load project");
  }

  return response.json();
}

export async function getProjectLogs(projectId: string) {
  const response = await fetch(`${API_BASE}/project/${projectId}/logs`);

  if (!response.ok) {
    throw new Error("Failed to load logs");
  }

  return response.json();
}

export async function getProjectFiles(projectId: string) {
  const response = await fetch(`${API_BASE}/project/${projectId}/files`);

  if (!response.ok) {
    throw new Error("Failed to load files");
  }

  return response.json();
}

export async function getProjectPreview(projectId: string) {
  const response = await fetch(`${API_BASE}/project/${projectId}/preview`);

  if (!response.ok) {
    throw new Error("Failed to load preview");
  }

  return response.json();
}

export interface RunEngineRequest {
  projectId: string;
  prompt: string;
  options?: {
    tab?: string;
    appType?: string;
    tech?: string;
    output?: string;
  };
}

export async function runEngine(input: RunEngineRequest) {
  const res = await fetch(`${API_BASE}/engine/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Engine run failed");
  }

  return res.json();
}

export async function sendProjectCommand(projectId: string, command: string) {
  const response = await fetch(`${API_BASE}/project/${projectId}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ command })
  });

  if (!response.ok) {
    throw new Error("Failed to send command");
  }

  return response.json();
}