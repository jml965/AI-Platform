import {
  ProductionReadinessResult
} from "./devops-readiness-types";

import { runReadinessChecks } from "./devops-readiness-checks";
import { calculateReadinessScore } from "./devops-readiness-score";

export class DevopsReadinessAgent {

  async evaluate(projectPath: string): Promise<ProductionReadinessResult> {

    const checks = runReadinessChecks(projectPath);

    const { score, grade } = calculateReadinessScore(checks);

    let ready = 0;
    let warning = 0;
    let notReady = 0;

    for (const c of checks) {
      if (c.status === "ready") ready++;
      if (c.status === "warning") warning++;
      if (c.status === "not-ready") notReady++;
    }

    return {
      score,
      grade,
      checks,
      summary: {
        total: checks.length,
        ready,
        warning,
        notReady
      },
      evaluatedAt: new Date().toISOString()
    };
  }
}
