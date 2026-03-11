import fs from "fs";
import path from "path";
import { DeploymentRecommendation } from "./deployment-intelligence-types";

export function generateRunbook(
  projectPath: string,
  recommendation: DeploymentRecommendation
) {

  const file = path.join(projectPath, "deploy-runbook.md");

  const content = `
# Deployment Runbook

## Recommended Target
${recommendation.recommendedTarget}

## Fallback Target
${recommendation.fallbackTarget}

## Startup Command
${recommendation.startupCommand ?? "N/A"}

## Ports
${recommendation.ports.join(", ")}

## Healthcheck
${recommendation.healthcheckPath ?? "Not detected"}

## Steps
${recommendation.steps
    .map(s => `${s.order}. ${s.title} — ${s.description}`)
    .join("\n")}

Generated automatically by Deployment Intelligence.
`;

  fs.writeFileSync(file, content);
}
