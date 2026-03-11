export type DeploymentProjectType =
  | 'static-site'
  | 'spa'
  | 'node-api'
  | 'fullstack-node'
  | 'worker'
  | 'unknown';

export type DeploymentTarget =
  | 'vercel'
  | 'netlify'
  | 'cloud-run'
  | 'railway'
  | 'render'
  | 'fly-io'
  | 'vps-docker-nginx'
  | 'docker-compose-vps'
  | 'unknown';

export type DeploymentPriority =
  | 'lowest-cost'
  | 'fastest-launch'
  | 'simplest-ops'
  | 'best-control';

export interface DeploymentSignal {
  key: string;
  detected: boolean;
  value?: string;
  note?: string;
}

export interface DeploymentRisk {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
}

export interface DeploymentPlanStep {
  order: number;
  title: string;
  description: string;
}

export interface DeploymentRecommendation {
  projectType: DeploymentProjectType;
  recommendedTarget: DeploymentTarget;
  fallbackTarget: DeploymentTarget;
  priority: DeploymentPriority;
  rationale: string[];
  signals: DeploymentSignal[];
  risks: DeploymentRisk[];
  steps: DeploymentPlanStep[];
  environmentKeys: string[];
  ports: number[];
  startupCommand?: string;
  healthcheckPath?: string;
  generatedAt: string;
}
