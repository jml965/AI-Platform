import type { ExecutionFeedState } from "./execution-log";

export interface SecurityIssue {
  id: string;
  type: 'secret' | 'header' | 'dependency' | 'xss' | 'sqli' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
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
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  note?: string;
}

export interface SecuritySummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface SecurityResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SecurityIssue[];
  headers: SecurityHeaderCheck[];
  summary: SecuritySummary;
  scannedAt: string;
}

export type EngineResult = {
  runId: string;
  projectId?: string;
  prompt: string;
  status: "success" | "failed";

  startedAt: string;
  finishedAt: string;
  durationMs: number;

  stageDurations: {
    workspace: number;
    planning: number;
    coding: number;
    fileWrite: number;
    review: number;
    execution: number;
    debug: number;
  };

  summary: {
    filesGenerated: number;
    issuesCount: number;
    errorCount: number;
    warningCount: number;
    executionRuntime: "executed" | "skipped";
    hasDebug: boolean;
    success: boolean;
  };

  plan: {
    summary: string;
    steps: string[];
  };

  files: Array<{
    path: string;
    content: string;
  }>;

  issues: Array<{
    severity: "low" | "medium" | "high";
    file?: string;
    message: string;
  }>;

  result: {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode?: number | null;
  };

  debug: string[];
  logs: string[];

  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };

  llm?: {
    planner: Record<string, any> | null;
    coder: Record<string, any> | null;
    reviewer: Record<string, any> | null;
  };

  executionFeed?: ExecutionFeedState;

  loop?: {
    ok: boolean;
    attempts: Array<{
      attempt: number;
      status: "success" | "failed" | "retrying";
      stage: string;
      error?: string;
      summary?: string;
    }>;
  };

  intent?: {
    type: string;
    confidence: number;
    signals: string[];
    rtl: boolean;
    language: "ar" | "en";
  };

  provisioning?: {
    success: boolean;
    remotePath?: string;
    nginxConfigPath?: string;
    logs?: string[];
    systemPackagesInstalled?: string[];
  };

  remoteDeployment?: {
    success: boolean;
    remotePath?: string;
    domain?: string;
    appUrl?: string;
    logs?: string[];
    nginxEnabledPath?: string;
  };

  security?: SecurityResult;
};

export type SecurityTrendStatus = 'improved' | 'regressed' | 'unchanged' | 'first-run';

export interface SecurityIssueSnapshot {
  id: string;
  type: 'secret' | 'header' | 'dependency' | 'xss' | 'sqli' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  filePath?: string;
  line?: number;
}

export interface SecurityMonitoringDelta {
  scoreDelta: number;
  previousScore: number | null;
  currentScore: number;
  previousGrade: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  currentGrade: 'A' | 'B' | 'C' | 'D' | 'F';
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

export type SecurityFeedEventType =
  | 'security-first-run'
  | 'security-improved'
  | 'security-regressed'
  | 'security-unchanged';

export interface SecurityFeedEvent {
  id: string;
  type: SecurityFeedEventType;
  projectPath: string;
  title: string;
  message: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreDelta: number;
  newIssuesCount: number;
  resolvedIssuesCount: number;
  unchangedIssuesCount: number;
  timestamp: string;
}

export interface SecurityScanApiResponse {
  status: 'success' | 'error';
  security: SecurityResult;
  monitoring?: SecurityMonitoringResult | null;
  latestEvent?: SecurityFeedEvent | null;
  feed?: SecurityFeedEvent[];
}

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

export type DevopsTrendStatus = 'improved' | 'regressed' | 'unchanged' | 'first-run';

export interface DevopsIssueSnapshot {
  id: string;
  type: DevopsIssueType;
  severity: DevopsSeverity;
  title: string;
  filePath?: string;
  line?: number;
}

export interface DevopsMonitoringDelta {
  scoreDelta: number;
  previousScore: number | null;
  currentScore: number;
  previousGrade: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  currentGrade: 'A' | 'B' | 'C' | 'D' | 'F';
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

export type DevopsFeedEventType =
  | 'devops-first-run'
  | 'devops-improved'
  | 'devops-regressed'
  | 'devops-unchanged';

export interface DevopsFeedEvent {
  id: string;
  type: DevopsFeedEventType;
  projectPath: string;
  title: string;
  message: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreDelta: number;
  newIssuesCount: number;
  resolvedIssuesCount: number;
  unchangedIssuesCount: number;
  timestamp: string;
}

export interface DevopsScanApiResponse {
  status: 'success' | 'error';
  devops: DevopsResult;
  monitoring?: DevopsMonitoringResult | null;
  latestEvent?: DevopsFeedEvent | null;
  feed?: DevopsFeedEvent[];
}

export interface DevopsFixResult {
  applied: string[];
  skipped: string[];
  updatedFiles: string[];
}

export interface DevopsFixApiResponse {
  status: 'success' | 'error';
  fixResult: DevopsFixResult;
  devops: DevopsResult;
  monitoring?: DevopsMonitoringResult | null;
  latestEvent?: DevopsFeedEvent | null;
  feed?: DevopsFeedEvent[];
}

export type DeploymentProjectType =
  | 'static-site'
  | 'spa'
  | 'node-api'
  | 'fullstack-node'
  | 'worker'
  | 'unknown';

export type DeploymentTarget =
  | 'vercel'
  | 'netlify'
  | 'cloud-run'
  | 'railway'
  | 'render'
  | 'fly-io'
  | 'vps-docker-nginx'
  | 'docker-compose-vps'
  | 'unknown';

export type DeploymentPriority =
  | 'lowest-cost'
  | 'fastest-launch'
  | 'simplest-ops'
  | 'best-control';

export interface DeploymentSignal {
  key: string;
  detected: boolean;
  value?: string;
  note?: string;
}

export interface DeploymentRisk {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
}

export interface DeploymentPlanStep {
  order: number;
  title: string;
  description: string;
}

export interface DeploymentRecommendation {
  projectType: DeploymentProjectType;
  recommendedTarget: DeploymentTarget;
  fallbackTarget: DeploymentTarget;
  priority: DeploymentPriority;
  rationale: string[];
  signals: DeploymentSignal[];
  risks: DeploymentRisk[];
  steps: DeploymentPlanStep[];
  environmentKeys: string[];
  ports: number[];
  startupCommand?: string;
  healthcheckPath?: string;
  generatedAt: string;
}

export interface DeploymentIntelligenceApiResponse {
  status: 'success' | 'error';
  deployment: DeploymentRecommendation;
}
