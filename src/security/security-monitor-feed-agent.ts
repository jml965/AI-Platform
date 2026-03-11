import type { SecurityMonitoringResult } from './security-monitor-types';
import type { SecurityScanResult } from './security-types';
import type { SecurityFeedEvent, SecurityFeedEventType } from './security-monitor-feed-types';
import { securityMonitorFeedStore } from './security-monitor-feed-store';

function buildEventType(status: SecurityMonitoringResult['delta']['status']): SecurityFeedEventType {
  switch (status) {
    case 'first-run':
      return 'security-first-run';
    case 'improved':
      return 'security-improved';
    case 'regressed':
      return 'security-regressed';
    case 'unchanged':
    default:
      return 'security-unchanged';
  }
}

function buildTitle(status: SecurityMonitoringResult['delta']['status']): string {
  switch (status) {
    case 'first-run':
      return 'First security scan recorded';
    case 'improved':
      return 'Security status improved';
    case 'regressed':
      return 'Security status regressed';
    case 'unchanged':
    default:
      return 'Security status unchanged';
  }
}

function buildMessage(
  monitoring: SecurityMonitoringResult,
  security: SecurityScanResult
): string {
  const { delta, summary } = monitoring;

  if (delta.status === 'first-run') {
    return `Initial baseline recorded. Score ${security.score}, grade ${security.grade}, total issues ${security.summary.totalIssues}.`;
  }

  if (delta.status === 'improved') {
    return `Score improved by ${delta.scoreDelta}. Resolved ${summary.resolvedIssuesCount} issue(s), new ${summary.newIssuesCount}.`;
  }

  if (delta.status === 'regressed') {
    return `Score dropped by ${Math.abs(delta.scoreDelta)}. New issues ${summary.newIssuesCount}, resolved ${summary.resolvedIssuesCount}.`;
  }

  return `No security score change. Score ${security.score}, unchanged issues ${summary.unchangedIssuesCount}.`;
}

export class SecurityMonitorFeedAgent {
  appendEvent(
    projectPath: string,
    security: SecurityScanResult,
    monitoring: SecurityMonitoringResult
  ): SecurityFeedEvent {
    const event: SecurityFeedEvent = {
      id: `security-feed:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      type: buildEventType(monitoring.delta.status),
      projectPath,
      title: buildTitle(monitoring.delta.status),
      message: buildMessage(monitoring, security),
      score: security.score,
      grade: security.grade,
      scoreDelta: monitoring.delta.scoreDelta,
      newIssuesCount: monitoring.summary.newIssuesCount,
      resolvedIssuesCount: monitoring.summary.resolvedIssuesCount,
      unchangedIssuesCount: monitoring.summary.unchangedIssuesCount,
      timestamp: new Date().toISOString(),
    };

    securityMonitorFeedStore.addEvent(projectPath, event);
    return event;
  }

  getEvents(projectPath: string): SecurityFeedEvent[] {
    return securityMonitorFeedStore.getEvents(projectPath);
  }
}
