// FILE: client/src/components/layout/left-panel.tsx
import { ExecutionLog } from "../workspace/execution-log";
import { CommandInput } from "../workspace/command-input";
import type { ExecutionFeedState } from "../../types/execution-log";

type Props = {
  projectId: string;
  isRunning: boolean;
  isPaused: boolean;
  executionFeed?: ExecutionFeedState;
  options?: { tab?: string; appType?: string; tech?: string; output?: string };
  onEngineResult?: (result: any) => void;
  onUserPrompt?: (prompt: string) => void;
};

export function LeftPanel({ projectId, isRunning, isPaused, executionFeed, options, onEngineResult, onUserPrompt }: Props) {
  return (
    <aside className="h-full bg-[#0b0f17] flex flex-col">
      <div className="px-4 py-4 border-b border-zinc-800">
        <h2 className="text-lg font-bold">سجل التنفيذ</h2>
        <p className="text-sm text-zinc-400 mt-1 truncate">
          Project ID: {projectId}
        </p>
      </div>

      <ExecutionLog projectId={projectId} executionFeed={executionFeed} />
      <CommandInput
        projectId={projectId}
        isRunning={isRunning}
        isPaused={isPaused}
        options={options}
        onEngineResult={onEngineResult}
        onUserPrompt={onUserPrompt}
      />
    </aside>
  );
}