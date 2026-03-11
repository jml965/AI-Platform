export type ReadinessLevel = "ready" | "warning" | "not-ready";

export interface ReadinessCheck {
  id: string;
  name: string;
  description: string;
  status: ReadinessLevel;
  message?: string;
}

export interface ProductionReadinessResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: ReadinessCheck[];
  summary: {
    total: number;
    ready: number;
    warning: number;
    notReady: number;
  };
  evaluatedAt: string;
}
