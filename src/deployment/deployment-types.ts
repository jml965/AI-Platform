export type DeploymentTarget =
  | "local-container"
  | "remote-server"
  | "static-host"
  | "node-server";

export interface DeploymentRequest {
  projectId: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  intent?: any;
}

export interface DeploymentResult {
  success: boolean;
  previewUrl?: string;
  containerId?: string;
  port?: number;
  projectPath?: string;
  logs?: string[];
}
