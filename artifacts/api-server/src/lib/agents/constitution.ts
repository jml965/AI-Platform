export interface AgentConstitution {
  maxTokensPerCall: number;
  maxRetriesPerTask: number;
  maxTotalTokensPerBuild: number;
  allowedFileExtensions: string[];
  maxFileSizeBytes: number;
  maxFilesPerProject: number;
}

const DEFAULT_CONSTITUTION: AgentConstitution = {
  maxTokensPerCall: 8192,
  maxRetriesPerTask: 3,
  maxTotalTokensPerBuild: 100000,
  allowedFileExtensions: [
    ".html", ".css", ".js", ".ts", ".tsx", ".jsx",
    ".json", ".svg", ".md", ".txt",
  ],
  maxFileSizeBytes: 512 * 1024,
  maxFilesPerProject: 50,
};

export function getConstitution(): AgentConstitution {
  return { ...DEFAULT_CONSTITUTION };
}

export function validateFilePath(filePath: string, projectId: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("/")) return false;
  return true;
}

export function validateFileExtension(filePath: string, constitution: AgentConstitution): boolean {
  const ext = filePath.substring(filePath.lastIndexOf("."));
  return constitution.allowedFileExtensions.includes(ext.toLowerCase());
}

export function checkTokenBudget(
  tokensUsed: number,
  constitution: AgentConstitution
): { allowed: boolean; remaining: number } {
  const remaining = constitution.maxTotalTokensPerBuild - tokensUsed;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}
