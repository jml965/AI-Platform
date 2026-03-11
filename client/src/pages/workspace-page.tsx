// FILE: client/src/pages/workspace-page.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDevopsFeed } from "@/api/devops-scan";
import type {
  DevopsFeedEvent,
  DevopsFixResult,
  DevopsMonitoringResult,
  DevopsResult
} from "@/types/engine-result";
import DevopsResultsPanel from "@/components/devops/devops-results-panel";
import DevopsButton from "@/components/topbar/devops-button";
import WorkspaceLayout from "../components/workspace/workspace-layout";

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectPath = projectId ?? "";

  const [devopsResult, setDevopsResult] = useState<DevopsResult | null>(null);
  const [devopsFixResult, setDevopsFixResult] = useState<DevopsFixResult | null>(null);
  const [devopsMonitoring, setDevopsMonitoring] = useState<DevopsMonitoringResult | null>(null);
  const [devopsFeed, setDevopsFeed] = useState<DevopsFeedEvent[]>([]);
  const [devopsLoading, setDevopsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDevopsFeed() {
      if (!projectPath) return;

      try {
        const feed = await getDevopsFeed(projectPath);
        if (mounted) {
          setDevopsFeed(feed);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadDevopsFeed();

    return () => {
      mounted = false;
    };
  }, [projectPath]);

  if (!projectId) {
    return (
      <div className="h-screen bg-[#0a0f18] text-white flex items-center justify-center">
        <p className="text-zinc-400">لا يوجد معرّف مشروع</p>
      </div>
    );
  }

  return <WorkspaceLayout projectId={projectId} />;
}