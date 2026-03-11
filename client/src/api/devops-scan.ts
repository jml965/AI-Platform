import type {
  DevopsFeedEvent,
  DevopsFixApiResponse,
  DevopsScanApiResponse
} from "@/types/engine-result";

export async function runDevopsScan(projectPath: string): Promise<DevopsScanApiResponse> {
  const res = await fetch("/api/devops-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectPath
    })
  });

  if (!res.ok) {
    throw new Error("DevOps scan failed");
  }

  return await res.json();
}

export async function runDevopsFix(projectPath: string): Promise<DevopsFixApiResponse> {
  const res = await fetch("/api/devops-fix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectPath
    })
  });

  if (!res.ok) {
    throw new Error("DevOps fix failed");
  }

  return await res.json();
}

export async function getDevopsFeed(projectPath: string): Promise<DevopsFeedEvent[]> {
  const query = new URLSearchParams({ projectPath }).toString();

  const res = await fetch(`/api/devops-feed?${query}`, {
    method: "GET"
  });

  if (!res.ok) {
    throw new Error("DevOps feed fetch failed");
  }

  const data = await res.json();
  return data.feed ?? [];
}
