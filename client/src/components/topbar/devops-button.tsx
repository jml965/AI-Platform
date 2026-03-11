import { runDevopsFix, runDevopsScan } from "@/api/devops-scan";
import type {
  DevopsFeedEvent,
  DevopsFixResult,
  DevopsMonitoringResult,
  DevopsResult
} from "@/types/engine-result";
import { useState } from "react";

type DevopsButtonProps = {
  projectPath: string;
  onResult?: (result: DevopsResult) => void;
  onFixResult?: (result: DevopsFixResult | null) => void;
  onMonitoringResult?: (result: DevopsMonitoringResult | null) => void;
  onFeedResult?: (feed: DevopsFeedEvent[]) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export default function DevopsButton({
  projectPath,
  onResult,
  onFixResult,
  onMonitoringResult,
  onFeedResult,
  onLoadingChange
}: DevopsButtonProps) {
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);

  async function handleScan() {
    setLoadingScan(true);
    onLoadingChange?.(true);

    try {
      const result = await runDevopsScan(projectPath);
      onResult?.(result.devops);
      onFixResult?.(null);
      onMonitoringResult?.(result.monitoring ?? null);
      onFeedResult?.(result.feed ?? []);
    } catch (error) {
      console.error(error);
      alert("DevOps scan failed");
    } finally {
      setLoadingScan(false);
      onLoadingChange?.(false);
    }
  }

  async function handleFix() {
    setLoadingFix(true);
    onLoadingChange?.(true);

    try {
      const result = await runDevopsFix(projectPath);
      onFixResult?.(result.fixResult);
      onResult?.(result.devops);
      onMonitoringResult?.(result.monitoring ?? null);
      onFeedResult?.(result.feed ?? []);
    } catch (error) {
      console.error(error);
      alert("DevOps fix failed");
    } finally {
      setLoadingFix(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleScan}
        disabled={loadingScan || loadingFix}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-60"
      >
        {loadingScan ? "Scanning..." : "DevOps Scan"}
      </button>

      <button
        onClick={handleFix}
        disabled={loadingScan || loadingFix}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60"
      >
        {loadingFix ? "Fixing..." : "DevOps Fix"}
      </button>
    </div>
  );
}
