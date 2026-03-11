import type { SecurityFeedEvent, SecurityScanApiResponse } from "@/types/engine-result";

export async function runSecurityScan(projectPath: string): Promise<SecurityScanApiResponse> {
  const res = await fetch("/api/security-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectPath
    })
  });

  if (!res.ok) {
    throw new Error("Security scan failed");
  }

  return await res.json();
}

export async function getSecurityFeed(projectPath: string): Promise<SecurityFeedEvent[]> {
  const query = new URLSearchParams({ projectPath }).toString();

  const res = await fetch(`/api/security-feed?${query}`, {
    method: "GET"
  });

  if (!res.ok) {
    throw new Error("Security feed fetch failed");
  }

  const data = await res.json();
  return data.feed ?? [];
}
