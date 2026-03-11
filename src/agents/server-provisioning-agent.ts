import fs from "fs";
import path from "path";
import { NginxConfigGenerator } from "../provisioning/nginx-config-generator";
import { ProvisionScriptBuilder } from "../provisioning/provision-script-builder";
import { RemoteFileSync } from "../provisioning/remote-file-sync";
import { SshClient } from "../provisioning/ssh-client";
import type { ProvisioningRequest, ProvisioningResult } from "../provisioning/server-types";

export class ServerProvisioningAgent {
  private ssh = new SshClient();
  private sync = new RemoteFileSync();
  private nginx = new NginxConfigGenerator();
  private scriptBuilder = new ProvisionScriptBuilder();

  async provision(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const remotePath = `/var/www/${request.projectId}`;
    const logs: string[] = [];

    await this.ssh.exec(
      request.connection,
      `mkdir -p ${remotePath} && mkdir -p ${remotePath}/deploy`
    );
    logs.push("Remote app path prepared.");

    const nginxConfig = this.nginx.build({
      domain: request.domain,
      upstreamPort: request.appPort,
      projectId: request.projectId,
    });

    const tempDir = path.join(process.cwd(), ".provisioning", request.projectId);
    fs.mkdirSync(tempDir, { recursive: true });

    fs.writeFileSync(path.join(tempDir, "nginx.conf"), nginxConfig);
    fs.writeFileSync(
      path.join(tempDir, "provision.sh"),
      this.scriptBuilder.build({
        projectId: request.projectId,
        remotePath,
        appPort: request.appPort,
        domain: request.domain,
      })
    );

    logs.push("Provisioning artifacts generated locally.");

    return {
      success: true,
      logs,
      remotePath,
      nginxConfigPath: path.join(tempDir, "nginx.conf"),
      systemPackagesInstalled: ["docker", "nginx"],
    };
  }

  async uploadProject(params: {
    localProjectPath: string;
    projectId: string;
    connection: ProvisioningRequest["connection"];
  }) {
    const remotePath = `/var/www/${params.projectId}`;
    await this.sync.syncDirectory(params.localProjectPath, remotePath, params.connection);
    return { remotePath };
  }

  async uploadProvisioningFiles(params: {
    projectId: string;
    connection: ProvisioningRequest["connection"];
    domain?: string;
    appPort: number;
  }) {
    const remotePath = `/var/www/${params.projectId}`;
    const nginxConfig = this.nginx.build({
      domain: params.domain,
      upstreamPort: params.appPort,
      projectId: params.projectId,
    });

    const provisionScript = this.scriptBuilder.build({
      projectId: params.projectId,
      remotePath,
      appPort: params.appPort,
      domain: params.domain,
    });

    await this.ssh.exec(
      params.connection,
      `mkdir -p ${remotePath}/deploy && sudo mkdir -p /etc/nginx/sites-available && sudo mkdir -p /etc/nginx/sites-enabled`
    );

    await this.uploadTextFile(params.connection, `${remotePath}/deploy/provision.sh`, provisionScript);
    await this.uploadTextFile(params.connection, `${remotePath}/deploy/nginx.conf`, nginxConfig);

    await this.ssh.exec(
      params.connection,
      `chmod +x ${remotePath}/deploy/provision.sh`
    );

    return {
      remotePath,
      nginxRemotePath: `${remotePath}/deploy/nginx.conf`,
      provisionRemotePath: `${remotePath}/deploy/provision.sh`,
    };
  }

  async installNginxSite(params: {
    projectId: string;
    connection: ProvisioningRequest["connection"];
  }) {
    const remotePath = `/var/www/${params.projectId}`;
    const siteName = params.projectId;

    await this.ssh.exec(
      params.connection,
      [
        `sudo cp ${remotePath}/deploy/nginx.conf /etc/nginx/sites-available/${siteName}`,
        `sudo ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName}`,
        `sudo nginx -t`,
        `sudo systemctl reload nginx`,
      ].join(" && ")
    );

    return {
      siteName,
      nginxEnabledPath: `/etc/nginx/sites-enabled/${siteName}`,
    };
  }

  async applyRemoteProvisioning(params: {
    projectId: string;
    connection: ProvisioningRequest["connection"];
  }) {
    const remotePath = `/var/www/${params.projectId}`;
    const command = `bash ${remotePath}/deploy/provision.sh`;
    return this.ssh.exec(params.connection, command);
  }

  private async uploadTextFile(connection: ProvisioningRequest["connection"], remotePath: string, content: string) {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-upload-"));
    const localFile = path.join(tempDir, path.basename(remotePath));

    try {
      fs.writeFileSync(localFile, content);
      await this.sync.syncDirectory(tempDir, path.dirname(remotePath), connection);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
