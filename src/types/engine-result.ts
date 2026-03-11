// FILE: src/types/engine-result.ts

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
  runId: string
  projectId?: string
  prompt: string
  status: "success" | "failed"

  startedAt: string
  finishedAt: string
  durationMs: number

  stageDurations: {
    workspace: number
    planning: number
    coding: number
    fileWrite: number
    review: number
    execution: number
    debug: number
  }

  summary: {
    filesGenerated: number
    issuesCount: number
    errorCount: number
    warningCount: number
    executionRuntime: "executed" | "skipped"
    hasDebug: boolean
    success: boolean
  }

  plan: {
    summary: string
    steps: string[]
  }

  files: Array<{
    path: string
    content: string
  }>

  issues: Array<{
    severity: "low" | "medium" | "high"
    file?: string
    message: string
  }>

  result: {
    success: boolean
    stdout: string
    stderr: string
    exitCode?: number | null
  }

  debug: string[]
  logs: string[]

  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
  }

  llm?: {
    planner: Record<string, any> | null
    coder: Record<string, any> | null
    reviewer: Record<string, any> | null
  }

  executionFeed?: ExecutionFeedState

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
}