export type AgentType = "planner" | "codegen" | "reviewer" | "fixer" | "filemanager" | "qa_pipeline" | "package_runner" | "surgical_edit" | "translator";

export type BuildStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export type ProjectFramework = "react-vite" | "express" | "nextjs" | "fastapi" | "static";

export interface AgentResult {
  success: boolean;
  tokensUsed: number;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface GeneratedFile {
  filePath: string;
  content: string;
  fileType: string;
}

export interface CodeReviewResult {
  approved: boolean;
  issues: CodeIssue[];
  suggestions: string[];
}

export interface CodeIssue {
  file: string;
  line?: number;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface PlanPhase {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  files: string[];
}

export interface ProjectPlan {
  framework: string;
  description: string;
  descriptionAr: string;
  directoryStructure: string[];
  files: string[];
  packages: string[];
  phases: PlanPhase[];
}

export type PlanStatus = "pending_approval" | "approved" | "rejected" | "modified";

export interface StoredPlan {
  buildId: string;
  projectId: string;
  userId: string;
  prompt: string;
  plan: ProjectPlan;
  status: PlanStatus;
  createdAt: string;
}

export interface BuildContext {
  buildId: string;
  projectId: string;
  userId: string;
  prompt: string;
  existingFiles: { filePath: string; content: string }[];
  tokensUsedSoFar: number;
  framework?: ProjectFramework;
  approvedPlan?: ProjectPlan;
}

export interface ProjectStructure {
  framework: ProjectFramework;
  files: GeneratedFile[];
  directories: string[];
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}
