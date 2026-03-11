export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SecurityIssueType =
  | 'secret'
  | 'header'
  | 'dependency'
  | 'xss'
  | 'sqli'
  | 'general';

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  filePath?: string;
  line?: number;
  recommendation?: string;
  rule?: string;
}

export interface SecurityHeaderCheck {
  name: string;
  status: 'present' | 'missing' | 'recommended';
  recommendedValue?: string;
  severity: SecuritySeverity;
  note?: string;
}

export interface SecurityScanSummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface SecurityScanResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SecurityIssue[];
  headers: SecurityHeaderCheck[];
  summary: SecurityScanSummary;
  scannedAt: string;
}

export interface SecurityScanApiResponse {
  status: 'success' | 'error';
  security: SecurityScanResult;
}
