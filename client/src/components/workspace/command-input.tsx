// FILE: client/src/components/workspace/command-input.tsx
import { useState } from "react";
import { runEngine } from "../../lib/api";

type Props = {
  projectId: string;
  isRunning?: boolean;
  isPaused?: boolean;
  options?: { tab?: string; appType?: string; tech?: string; output?: string };
  onEngineResult?: (result: any) => void;
  onUserPrompt?: (prompt: string) => void;
};

export function CommandInput({ projectId, isRunning = false, isPaused = false, options, onEngineResult, onUserPrompt }: Props) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSend =
    prompt.trim().length > 0 &&
    !isRunning &&
    !isPaused &&
    !isSubmitting;

  async function handleSend() {
    if (!canSend) return;

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    try {
      setIsSubmitting(true);
      setPrompt("");

      onUserPrompt?.(cleanPrompt);

      const result = await runEngine({
        projectId,
        prompt: cleanPrompt,
        options
      });

      onEngineResult?.(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border-t border-zinc-800 p-4 bg-[#0b0f17]">
      <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-3">
        <textarea
          data-testid="input-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="اكتب أمراً جديداً أو أوقف التنفيذ إذا وجدت فهماً خاطئاً..."
          className="w-full h-24 bg-transparent outline-none resize-none text-sm text-white placeholder:text-zinc-500"
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              data-testid="button-stop"
              disabled={!isRunning}
              className="px-4 h-10 rounded-xl border border-red-700 text-red-300 hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              إيقاف
            </button>
            <button
              data-testid="button-resume"
              disabled={!isPaused}
              className="px-4 h-10 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              استئناف
            </button>
          </div>

          <button
            data-testid="button-send"
            onClick={handleSend}
            disabled={!canSend}
            className="px-5 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 font-medium"
          >
            {isSubmitting ? "جاري الإرسال..." : "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}