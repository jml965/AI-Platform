import type { DevopsIssue, DevopsResult } from './devops-types';
import type {
  DevopsIssueSnapshot,
  DevopsMonitoringResult,
  DevopsTrendStatus,
} from './devops-monitor-types';
import { devopsMonitorStore } from './devops-monitor-store';

function toSnapshot(issue: DevopsIssue): DevopsIssueSnapshot {
  return {
    id: issue.id,
    type: issue.type,
    severity: issue.severity,
    title: issue.title,
    filePath: issue.filePath,
    line: issue.line,
  };
}

function issueIdentity(issue: Pick<DevopsIssue, 'type' | 'severity' | 'title' | 'filePath' | 'line'>): string {
  return [
    issue.type,
    issue.severity,
    issue.title,
    issue.filePath ?? '',
    String(issue.line ?? ''),
  ].join('::');
}

function buildIssueMap(issues: DevopsIssue[]): Map<string, DevopsIssue> {
  const map = new Map<string, DevopsIssue>();
  for (const issue of issues) {
    map.set(issueIdentity(issue), issue);
  }
  return map;
}

function resolveTrendStatus(scoreDelta: number, hasPrevious: boolean): DevopsTrendStatus {
  if (!hasPrevious) return 'first-run';
  if (scoreDelta > 0) return 'improved';
  if (scoreDelta < 0) return 'regressed';
  return 'unchanged';
}

export class DevopsMonitorAgent {
  async compareAndStore(
    projectPath: string,
    currentResult: DevopsResult
  ): Promise<DevopsMonitoringResult> {
    const previousResult = devopsMonitorStore.getLastScan(projectPath);

    if (!previousResult) {
      devopsMonitorStore.setLastScan(projectPath, currentResult);

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

    const newIssues: DevopsIssueSnapshot[] = [];
    const resolvedIssues: DevopsIssueSnapshot[] = [];
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

    const monitoring: DevopsMonitoringResult = {
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

    devopsMonitorStore.setLastScan(projectPath, currentResult);

    return monitoring;
  }
}
