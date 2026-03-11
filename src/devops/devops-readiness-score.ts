import { ReadinessCheck } from "./devops-readiness-types";

export function calculateReadinessScore(checks: ReadinessCheck[]) {

  let score = 0;

  for (const c of checks) {
    if (c.status === "ready") score += 20;
    if (c.status === "warning") score += 10;
  }

  if (score > 100) score = 100;

  let grade: "A" | "B" | "C" | "D" | "F" = "F";

  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, grade };
}
