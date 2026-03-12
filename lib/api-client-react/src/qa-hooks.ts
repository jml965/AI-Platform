import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface QaCheckItem {
  name: string;
  nameAr: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  messageAr: string;
  file?: string;
  line?: number;
}

interface QaPhaseResult {
  status: string;
  score: number | null;
  details: {
    checks: QaCheckItem[];
    summary: string;
    summaryAr: string;
  } | null;
}

export interface QaReportResponse {
  id: string;
  projectId: string;
  buildId: string;
  status: string;
  overallScore: number | null;
  lint: QaPhaseResult;
  runtime: QaPhaseResult;
  functional: QaPhaseResult;
  retryCount: number;
  maxRetries: number;
  fixAttempts: Array<{
    attempt: number;
    phase: string;
    issues: string[];
    fixed: boolean;
    timestamp: string;
  }> | null;
  totalDurationMs: number | null;
  totalCostUsd: number;
  createdAt: string;
  completedAt: string | null;
}

interface QaStatsResponse {
  totalReports: number;
  passRate: number;
  statusBreakdown: { passed: number; warning: number; failed: number };
  averageScores: { overall: number; lint: number; runtime: number; functional: number };
  averageDurationMs: number;
}

export function useListQaReports(projectId: string | undefined) {
  return useQuery<{ data: QaReportResponse[] }>({
    queryKey: ["qa-reports", projectId],
    queryFn: () =>
      customFetch(`${API_BASE}/projects/${projectId}/qa`, {
        credentials: "include",
      }),
    enabled: !!projectId,
  });
}

export function useLatestQaReport(projectId: string | undefined) {
  return useQuery<QaReportResponse>({
    queryKey: ["qa-report-latest", projectId],
    queryFn: () =>
      customFetch(`${API_BASE}/projects/${projectId}/qa/latest`, {
        credentials: "include",
      }),
    enabled: !!projectId,
  });
}

export function useQaReport(reportId: string | undefined) {
  return useQuery<QaReportResponse>({
    queryKey: ["qa-report", reportId],
    queryFn: () =>
      customFetch(`${API_BASE}/qa/${reportId}`, {
        credentials: "include",
      }),
    enabled: !!reportId,
  });
}

export function useRunQa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, buildId }: { projectId: string; buildId: string }) =>
      customFetch(`${API_BASE}/projects/${projectId}/qa/run`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ buildId }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["qa-reports", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["qa-report-latest", variables.projectId] });
    },
  });
}

export function useQaStats() {
  return useQuery<QaStatsResponse>({
    queryKey: ["qa-stats"],
    queryFn: () =>
      customFetch(`${API_BASE}/qa/stats/summary`, {
        credentials: "include",
      }),
  });
}
