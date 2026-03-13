import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ArrowLeft, LayoutTemplate, LogOut, ChevronDown, ChevronRight,
  Loader2, CheckCircle, XCircle, AlertTriangle, Clock, DollarSign,
  BarChart3, RefreshCw, FileCode, Zap, TestTube,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  useListQaReports,
  useQaStats,
  useAuthLogout,
  type QaReportResponse,
} from "@workspace/api-client-react";

const CURRENCY_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
  en: { rate: 1, symbol: "$", code: "USD" },
  ar: { rate: 3.75, symbol: "ر.س", code: "SAR" },
};

function formatCost(costUsd: number, lang: string): string {
  const curr = CURRENCY_RATES[lang] || CURRENCY_RATES.en;
  const localAmount = costUsd * curr.rate;
  if (lang === "ar") {
    return `${localAmount.toFixed(4)} ${curr.symbol}`;
  }
  return `${curr.symbol}${localAmount.toFixed(4)}`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  if (score === null) return null;
  const color =
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-yellow-400" :
    "text-red-400";
  const bgColor =
    score >= 80 ? "bg-emerald-500/10 border-emerald-500/30" :
    score >= 60 ? "bg-yellow-500/10 border-yellow-500/30" :
    "bg-red-500/10 border-red-500/30";
  const sizeClass = size === "lg" ? "text-3xl font-bold px-4 py-2" : size === "md" ? "text-lg font-semibold px-3 py-1" : "text-sm px-2 py-0.5";

  return (
    <span className={`${bgColor} ${color} border rounded-lg inline-flex items-center gap-1 ${sizeClass}`}>
      {score}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "passed": return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case "failed": return <XCircle className="w-5 h-5 text-red-400" />;
    case "in_progress": return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    case "pending": return <Clock className="w-5 h-5 text-gray-400" />;
    default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
  }
}

function statusLabel(status: string, t: any): string {
  const map: Record<string, string> = {
    passed: t.qa_passed,
    warning: t.qa_warning,
    failed: t.qa_failed,
    pending: t.qa_pending,
    in_progress: t.qa_in_progress,
    error: t.qa_error,
  };
  return map[status] || status;
}

function PhaseCard({
  title,
  icon,
  phase,
  lang,
}: {
  title: string;
  icon: React.ReactNode;
  phase: { status: string; score: number | null; details: any | null };
  lang: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const checks = phase.details?.checks || [];

  return (
    <motion.div
      className="bg-[#1a1a2e]/60 border border-white/10 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-white">{title}</span>
          <StatusIcon status={phase.status} />
          <span className="text-sm text-gray-400">{statusLabel(phase.status, t)}</span>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={phase.score} size="sm" />
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && checks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-2">
              {checks.map((check: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    check.passed ? "bg-emerald-500/5" : check.severity === "error" ? "bg-red-500/5" : "bg-yellow-500/5"
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : check.severity === "error" ? (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {lang === "ar" ? check.nameAr : check.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {lang === "ar" ? check.messageAr : check.message}
                    </div>
                    {check.file && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">{check.file}{check.line ? `:${check.line}` : ""}</div>
                    )}
                  </div>
                </div>
              ))}
              {phase.details && (
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
                  {lang === "ar" ? phase.details.summaryAr : phase.details.summary}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReportCard({ report, lang }: { report: QaReportResponse; lang: string }) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      className="bg-[#0f0f23]/80 border border-white/10 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon status={report.status} />
            <div>
              <span className="text-white font-medium">{statusLabel(report.status, t)}</span>
              <span className="text-xs text-gray-500 mx-2">•</span>
              <span className="text-xs text-gray-400 font-mono">{report.buildId.slice(0, 8)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={report.overallScore} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{t.qa_duration}</div>
            <div className="text-sm text-white font-medium">{formatDuration(report.totalDurationMs)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{t.qa_cost}</div>
            <div className="text-sm text-white font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatCost(report.totalCostUsd, lang)}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{t.qa_retry_count}</div>
            <div className="text-sm text-white font-medium">{report.retryCount}/{report.maxRetries}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{t.qa_completed_at}</div>
            <div className="text-sm text-white font-medium">
              {report.completedAt ? new Date(report.completedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" }) : "-"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <PhaseCard
            title={t.qa_lint}
            icon={<FileCode className="w-5 h-5 text-blue-400" />}
            phase={report.lint}
            lang={lang}
          />
          <PhaseCard
            title={t.qa_runtime}
            icon={<Zap className="w-5 h-5 text-purple-400" />}
            phase={report.runtime}
            lang={lang}
          />
          <PhaseCard
            title={t.qa_functional}
            icon={<TestTube className="w-5 h-5 text-teal-400" />}
            phase={report.functional}
            lang={lang}
          />
        </div>

        {report.fixAttempts && report.fixAttempts.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t.qa_fix_attempts} ({report.fixAttempts.length})
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 space-y-2"
                >
                  {report.fixAttempts.map((attempt, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">
                          {t.qa_attempt} {attempt.attempt}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            {attempt.phase}
                          </span>
                          {attempt.fixed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                      {attempt.issues.length > 0 && (
                        <ul className="text-xs text-gray-400 space-y-1">
                          {attempt.issues.slice(0, 5).map((issue, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                          {attempt.issues.length > 5 && (
                            <li className="text-gray-500">+{attempt.issues.length - 5} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function QualityAssurance() {
  const { t, lang } = useI18n();
  const logout = useAuthLogout();
  const [, params] = useRoute("/qa/:projectId");
  const projectId = params?.projectId;

  const { data: reportsData, isLoading } = useListQaReports(projectId);
  const { data: stats } = useQaStats();

  const reports: QaReportResponse[] = reportsData?.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2d] to-[#1a0a2e]">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors">
              <LayoutTemplate className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-lg">Buildr</span>
            </Link>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-medium">{t.qa_title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/" className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </Link>
            <button
              onClick={() => logout.mutate(undefined)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {stats && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-[#0f0f23]/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <BarChart3 className="w-4 h-4" />
                {t.qa_total_reports}
              </div>
              <div className="text-2xl font-bold text-white">{stats.totalReports}</div>
            </div>
            <div className="bg-[#0f0f23]/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                {t.qa_pass_rate}
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.passRate}%</div>
            </div>
            <div className="bg-[#0f0f23]/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <ShieldCheck className="w-4 h-4" />
                {t.qa_avg_score}
              </div>
              <div className="text-2xl font-bold text-blue-400">{stats?.averageScores?.overall ?? "—"}</div>
            </div>
            <div className="bg-[#0f0f23]/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                {t.qa_duration}
              </div>
              <div className="text-2xl font-bold text-purple-400">{formatDuration(stats.averageDurationMs)}</div>
            </div>
          </motion.div>
        )}

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          {t.qa_reports}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t.qa_no_reports}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} lang={lang} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
