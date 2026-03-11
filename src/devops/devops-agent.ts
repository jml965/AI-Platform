import type { DevopsCheckItem, DevopsIssue, DevopsResult } from './devops-types';
import { DevopsDockerScanner } from './devops-docker-scanner';
import { DevopsEnvScanner } from './devops-env-scanner';
import { DevopsHealthcheckScanner } from './devops-healthcheck-scanner';
import { DevopsScoreCalculator } from './devops-score-calculator';

function dedupeIssues(issues: DevopsIssue[]): DevopsIssue[] {
  const seen = new Set<string>();
  const result: DevopsIssue[] = [];

  for (const issue of issues) {
    const key = [
      issue.type,
      issue.severity,
      issue.title,
      issue.filePath ?? '',
      String(issue.line ?? ''),
      issue.rule ?? '',
    ].join('::');

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(issue);
  }

  return result;
}

function dedupeChecks(checks: DevopsCheckItem[]): DevopsCheckItem[] {
  const map = new Map<string, DevopsCheckItem>();
  for (const check of checks) {
    map.set(check.key, check);
  }
  return Array.from(map.values());
}

export class DevopsAgent {
  private readonly dockerScanner = new DevopsDockerScanner();
  private readonly envScanner = new DevopsEnvScanner();
  private readonly healthcheckScanner = new DevopsHealthcheckScanner();
  private readonly scoreCalculator = new DevopsScoreCalculator();

  async scan(projectPath: string): Promise<DevopsResult> {
    const [docker, env, health] = await Promise.all([
      this.dockerScanner.scan(projectPath),
      this.envScanner.scan(projectPath),
      this.healthcheckScanner.scan(projectPath),
    ]);

    const issues = dedupeIssues([
      ...docker.issues,
      ...env.issues,
      ...health.issues,
    ]);

    const checks = dedupeChecks([
      ...docker.checks,
      ...env.checks,
      ...health.checks,
    ]);

    const summary = this.scoreCalculator.buildSummary(issues);
    const { score, grade } = this.scoreCalculator.calculate(issues);

    return {
      score,
      grade,
      issues,
      checks,
      summary,
      scannedAt: new Date().toISOString(),
    };
  }
}
