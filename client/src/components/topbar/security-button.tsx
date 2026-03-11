import { runSecurityScan } from "@/api/security-scan";
import type {
  SecurityFeedEvent,
  SecurityMonitoringResult,
  SecurityResult
} from "@/types/engine-result";
import { useState } from "react";

type SecurityButtonProps = {
  projectPath: string;
  onResult?: (result: SecurityResult) => void;
  onMonitoringResult?: (monitoring: SecurityMonitoringResult | null) => void;
  onFeedResult?: (feed: SecurityFeedEvent[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onAiAnalysis?: (analysis: any) => void;
};

export default function SecurityButton({
  projectPath,
  onResult,
  onMonitoringResult,
  onFeedResult,
  onLoadingChange,
  onAiAnalysis
}: SecurityButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleScan() {
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const result = await runSecurityScan(projectPath);

      if (result?.security) {
        onResult?.(result.security);
      }

      onMonitoringResult?.(result?.monitoring ?? null);
      onFeedResult?.(result?.feed ?? []);
      onAiAnalysis?.((result as any)?.aiAnalysis ?? null);
    } catch (error) {
      console.error(error);
      alert("Security scan failed");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <button
      onClick={handleScan}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-60"
    >
      {loading ? "Scanning..." : "Security Scan"}
    </button>
  );
}
