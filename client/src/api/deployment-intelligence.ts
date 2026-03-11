import type { DeploymentIntelligenceApiResponse } from "@/types/engine-result";

export async function runDeploymentIntelligence(projectPath: string): Promise<DeploymentIntelligenceApiResponse> {
  const res = await fetch("/api/deployment-intelligence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectPath
    })
  });

  if (!res.ok) {
    throw new Error("Deployment intelligence failed");
  }

  return await res.json();
}
