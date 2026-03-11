import type { DevopsMonitoringResult } from './devops-monitor-types';
import type { DevopsResult } from './devops-types';
import type { DevopsFeedEvent, DevopsFeedEventType } from './devops-monitor-feed-types';
import { devopsMonitorFeedStore } from './devops-monitor-feed-store';

function buildEventType(status: DevopsMonitoringResult['delta']['status']): DevopsFeedEventType {
  switch (status) {
    case 'first-run':
      return 'devops-first-run';
    case 'improved':
      return 'devops-improved';
    case 'regressed':
      return 'devops-regressed';
    case 'unchanged':
    default:
      return 'devops-unchanged';
  }
}

function buildTitle(status: DevopsMonitoringResult['delta']['status']): string {
  switch (status) {
    case 'first-run':
      return 'First DevOps scan recorded';
    case 'improved':
      return 'DevOps status improved';
    case 'regressed':
      return 'DevOps status regressed';
    case 'unchanged':
    default:
      return 'DevOps status unchanged';
  }
}

function buildMessage(
  monitoring: DevopsMonitoringResult,
  devops: DevopsResult
): string {
  const { delta, summary } = monitoring;

  if (delta.status === 'first-run') {
    return `Initial DevOps baseline recorded. Score ${devops.score}, grade ${devops.grade}, total issues ${devops.summary.totalIssues}.`;
  }

  if (delta.status === 'improved') {
    return `DevOps score improved by ${delta.scoreDelta}. Resolved ${summary.resolvedIssuesCount} issue(s), new ${summary.newIssuesCount}.`;
  }

  if (delta.status === 'regressed') {
    return `DevOps score dropped by ${Math.abs(delta.scoreDelta)}. New issues ${summary.newIssuesCount}, resolved ${summary.resolvedIssuesCount}.`;
  }

  return `No DevOps score change. Score ${devops.score}, unchanged issues ${summary.unchangedIssuesCount}.`;
}

export class DevopsMonitorFeedAgent {
  appendEvent(
    projectPath: string,
    devops: DevopsResult,
    monitoring: DevopsMonitoringResult
  ): DevopsFeedEvent {
    const event: DevopsFeedEvent = {
      id: `devops-feed:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      type: buildEventType(monitoring.delta.status),
      projectPath,
      title: buildTitle(monitoring.delta.status),
      message: buildMessage(monitoring, devops),
      score: devops.score,
      grade: devops.grade,
      scoreDelta: monitoring.delta.scoreDelta,
      newIssuesCount: monitoring.summary.newIssuesCount,
      resolvedIssuesCount: monitoring.summary.resolvedIssuesCount,
      unchangedIssuesCount: monitoring.summary.unchangedIssuesCount,
      timestamp: new Date().toISOString(),
    };

    devopsMonitorFeedStore.addEvent(projectPath, event);
    return event;
  }

  getEvents(projectPath: string): DevopsFeedEvent[] {
    return devopsMonitorFeedStore.getEvents(projectPath);
  }
}
