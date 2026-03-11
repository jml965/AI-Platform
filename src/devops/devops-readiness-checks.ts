import fs from "fs";
import path from "path";
import { ReadinessCheck } from "./devops-readiness-types";

function exists(p: string) {
  return fs.existsSync(p);
}

export function runReadinessChecks(projectPath: string): ReadinessCheck[] {

  const checks: ReadinessCheck[] = [];

  const dockerfile = path.join(projectPath, "Dockerfile");
  const envExample = path.join(projectPath, ".env.example");
  const packageJson = path.join(projectPath, "package.json");

  // Docker
  checks.push({
    id: "dockerfile",
    name: "Dockerfile",
    description: "Project contains Dockerfile for container deployment",
    status: exists(dockerfile) ? "ready" : "not-ready",
  });

  // Env
  checks.push({
    id: "env-example",
    name: ".env.example",
    description: "Environment variables example exists",
    status: exists(envExample) ? "ready" : "warning",
  });

  // package.json
  checks.push({
    id: "package-json",
    name: "package.json",
    description: "Node project manifest exists",
    status: exists(packageJson) ? "ready" : "not-ready",
  });

  // health endpoint convention
  const healthFile = path.join(projectPath, "server/routes/health.ts");

  checks.push({
    id: "health-endpoint",
    name: "Health Endpoint",
    description: "Health endpoint available for infrastructure monitoring",
    status: exists(healthFile) ? "ready" : "warning",
  });

  // logs directory
  const logsDir = path.join(projectPath, "logs");

  checks.push({
    id: "logs-directory",
    name: "Logs Directory",
    description: "Logs folder available for production logging",
    status: exists(logsDir) ? "ready" : "warning",
  });

  // CI pipeline
  const githubCI = path.join(projectPath, ".github/workflows");

  checks.push({
    id: "ci-pipeline",
    name: "CI Pipeline",
    description: "Continuous integration workflow",
    status: exists(githubCI) ? "ready" : "warning",
  });

  return checks;
}
