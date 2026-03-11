import { SecurityIssue, SecurityScanSummary } from './security-types';

function weight(severity: SecurityIssue['severity']): number {
  switch (severity) {
    case 'critical': return 30;
    case 'high': return 18;
    case 'medium': return 10;
    case 'low': return 4;
    case 'info': return 1;
    default: return 0;
  }
}

export class SecurityScoreCalculator {
  buildSummary(issues: SecurityIssue[]): SecurityScanSummary {
    return {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length
    };
  }

  calculate(issues: SecurityIssue[]): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
    const totalPenalty = issues.reduce((sum, issue) => sum + weight(issue.severity), 0);
    const rawScore = Math.max(0, 100 - totalPenalty);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (rawScore >= 90) grade = 'A';
    else if (rawScore >= 75) grade = 'B';
    else if (rawScore >= 60) grade = 'C';
    else if (rawScore >= 40) grade = 'D';

    return { score: rawScore, grade };
  }
}
