import type { DevopsIssue, DevopsSummary } from './devops-types';

function severityWeight(severity: DevopsIssue['severity']): number {
  switch (severity) {
    case 'critical':
      return 30;
    case 'high':
      return 18;
    case 'medium':
      return 10;
    case 'low':
      return 4;
    case 'info':
    default:
      return 1;
  }
}

export class DevopsScoreCalculator {
  buildSummary(issues: DevopsIssue[]): DevopsSummary {
    return {
      totalIssues: issues.length,
      critical: issues.filter((i) => i.severity === 'critical').length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };
  }

  calculate(issues: DevopsIssue[]): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
    const penalty = issues.reduce((sum, issue) => sum + severityWeight(issue.severity), 0);
    const score = Math.max(0, 100 - penalty);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';

    return { score, grade };
  }
}
