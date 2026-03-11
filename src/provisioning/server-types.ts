export interface ServerConnection {
  host: string;
  port?: number;
  username: string;
  privateKey?: string;
  password?: string;
}

export interface ProvisioningRequest {
  projectId: string;
  domain?: string;
  appPort: number;
  connection: ServerConnection;
}

export interface ProvisioningResult {
  success: boolean;
  logs: string[];
  remotePath: string;
  nginxConfigPath?: string;
  systemPackagesInstalled?: string[];
}
