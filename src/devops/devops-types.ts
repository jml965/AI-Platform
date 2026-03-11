export type DevopsSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type DevopsIssueType =
  | 'docker'
  | 'env'
  | 'healthcheck'
  | 'process'
  | 'port'
  | 'deployment'
  | 'general';

export interface DevopsIssue {
  id: string;
  type: DevopsIssueType;
  severity: DevopsSeverity;
  title: string;
  description: string;
  filePath?: string;
  line?: number;
  recommendation?: string;
  rule?: string;
}

export interface DevopsCheckItem {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  note?: string;
}

export interface DevopsSummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface DevopsResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: DevopsIssue[];
  checks: DevopsCheckItem[];
  summary: DevopsSummary;
  scannedAt: string;
}
