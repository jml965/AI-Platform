import type { DevopsIssue, DevopsResult } from './devops-types';

export type DevopsTrendStatus = 'improved' | 'regressed' | 'unchanged' | 'first-run';

export interface DevopsIssueSnapshot {
  id: string;
  type: DevopsIssue['type'];
  severity: DevopsIssue['severity'];
  title: string;
  filePath?: string;
  line?: number;
}

export interface DevopsMonitoringDelta {
  scoreDelta: number;
  previousScore: number | null;
  currentScore: number;
  previousGrade: DevopsResult['grade'] | null;
  currentGrade: DevopsResult['grade'];
  status: DevopsTrendStatus;
}

export interface DevopsMonitoringSummary {
  totalPreviousIssues: number;
  totalCurrentIssues: number;
  newIssuesCount: number;
  resolvedIssuesCount: number;
  unchangedIssuesCount: number;
}

export interface DevopsMonitoringResult {
  delta: DevopsMonitoringDelta;
  summary: DevopsMonitoringSummary;
  newIssues: DevopsIssueSnapshot[];
  resolvedIssues: DevopsIssueSnapshot[];
  comparedAt: string;
}
