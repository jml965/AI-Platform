import type { SecurityIssue, SecurityScanResult } from './security-types';
import type {
  SecurityIssueSnapshot,
  SecurityMonitoringResult,
  SecurityTrendStatus,
} from './security-monitor-types';
import { securityMonitorStore } from './security-monitor-store';

function toSnapshot(issue: SecurityIssue): SecurityIssueSnapshot {
  return {
    id: issue.id,
    type: issue.type,
    severity: issue.severity,
    title: issue.title,
    filePath: issue.filePath,
    line: issue.line,
  };
}

function issueIdentity(issue: Pick<SecurityIssue, 'type' | 'severity' | 'title' | 'filePath' | 'line'>): string {
  return [
    issue.type,
    issue.severity,
    issue.title,
    issue.filePath ?? '',
    String(issue.line ?? ''),
  ].join('::');
}

function buildIssueMap(issues: SecurityIssue[]): Map<string, SecurityIssue> {
  const map = new Map<string, SecurityIssue>();
  for (const issue of issues) {
    map.set(issueIdentity(issue), issue);
  }
  return map;
}

function resolveTrendStatus(scoreDelta: number, hasPrevious: boolean): SecurityTrendStatus {
  if (!hasPrevious) return 'first-run';
  if (scoreDelta > 0) return 'improved';
  if (scoreDelta < 0) return 'regressed';
  return 'unchanged';
}

export class SecurityMonitorAgent {
  async compareAndStore(
    projectPath: string,
    currentResult: SecurityScanResult
  ): Promise<SecurityMonitoringResult> {
    const previousResult = securityMonitorStore.getLastScan(projectPath);

    if (!previousResult) {
      securityMonitorStore.setLastScan(projectPath, currentResult);

      return {
        delta: {
          scoreDelta: 0,
          previousScore: null,
          currentScore: currentResult.score,
          previousGrade: null,
          currentGrade: currentResult.grade,
          status: 'first-run',
        },
        summary: {
          totalPreviousIssues: 0,
          totalCurrentIssues: currentResult.issues.length,
          newIssuesCount: currentResult.issues.length,
          resolvedIssuesCount: 0,
          unchangedIssuesCount: 0,
        },
        newIssues: currentResult.issues.map(toSnapshot),
        resolvedIssues: [],
        comparedAt: new Date().toISOString(),
      };
    }

    const previousIssuesMap = buildIssueMap(previousResult.issues);
    const currentIssuesMap = buildIssueMap(currentResult.issues);

    const newIssues: SecurityIssueSnapshot[] = [];
    const resolvedIssues: SecurityIssueSnapshot[] = [];
    let unchangedIssuesCount = 0;

    currentIssuesMap.forEach((issue, key) => {
      if (!previousIssuesMap.has(key)) {
        newIssues.push(toSnapshot(issue));
      } else {
        unchangedIssuesCount += 1;
      }
    });

    previousIssuesMap.forEach((issue, key) => {
      if (!currentIssuesMap.has(key)) {
        resolvedIssues.push(toSnapshot(issue));
      }
    });

    const scoreDelta = currentResult.score - previousResult.score;

    const monitoring: SecurityMonitoringResult = {
      delta: {
        scoreDelta,
        previousScore: previousResult.score,
        currentScore: currentResult.score,
        previousGrade: previousResult.grade,
        currentGrade: currentResult.grade,
        status: resolveTrendStatus(scoreDelta, true),
      },
      summary: {
        totalPreviousIssues: previousResult.issues.length,
        totalCurrentIssues: currentResult.issues.length,
        newIssuesCount: newIssues.length,
        resolvedIssuesCount: resolvedIssues.length,
        unchangedIssuesCount,
      },
      newIssues,
      resolvedIssues,
      comparedAt: new Date().toISOString(),
    };

    securityMonitorStore.setLastScan(projectPath, currentResult);

    return monitoring;
  }
}
