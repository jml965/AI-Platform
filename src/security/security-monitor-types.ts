import type { SecurityIssue, SecurityScanResult } from './security-types';
import type { SecurityFeedEvent } from './security-monitor-feed-types';

export type SecurityTrendStatus = 'improved' | 'regressed' | 'unchanged' | 'first-run';

export interface SecurityIssueSnapshot {
  id: string;
  type: SecurityIssue['type'];
  severity: SecurityIssue['severity'];
  title: string;
  filePath?: string;
  line?: number;
}

export interface SecurityMonitoringDelta {
  scoreDelta: number;
  previousScore: number | null;
  currentScore: number;
  previousGrade: SecurityScanResult['grade'] | null;
  currentGrade: SecurityScanResult['grade'];
  status: SecurityTrendStatus;
}

export interface SecurityMonitoringSummary {
  totalPreviousIssues: number;
  totalCurrentIssues: number;
  newIssuesCount: number;
  resolvedIssuesCount: number;
  unchangedIssuesCount: number;
}

export interface SecurityMonitoringResult {
  delta: SecurityMonitoringDelta;
  summary: SecurityMonitoringSummary;
  newIssues: SecurityIssueSnapshot[];
  resolvedIssues: SecurityIssueSnapshot[];
  comparedAt: string;
}

export interface SecurityMonitoringEnvelope {
  monitoring: SecurityMonitoringResult;
  latestEvent: SecurityFeedEvent | null;
  feed: SecurityFeedEvent[];
}
