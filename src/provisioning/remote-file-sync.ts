import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import type { ServerConnection } from "./server-types";

function writeTempPrivateKey(privateKey: string): string {
  const tempPath = path.join(
    os.tmpdir(),
    `sync_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  fs.writeFileSync(tempPath, privateKey, { mode: 0o600 });
  return tempPath;
}

export class RemoteFileSync {
  async syncDirectory(localPath: string, remotePath: string, connection: ServerConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = connection.port || 22;
      const target = `${connection.username}@${connection.host}:${remotePath}`;

      let tempKeyPath: string | null = null;
      if (connection.privateKey) {
        tempKeyPath = writeTempPrivateKey(connection.privateKey);
      }

      const sshCommand = connection.privateKey
        ? `ssh -p ${port} -o StrictHostKeyChecking=no -i "${tempKeyPath}"`
        : `ssh -p ${port} -o StrictHostKeyChecking=no`;

      const args = [
        "-az",
        "--delete",
        "-e",
        sshCommand,
        `${localPath}/`,
        target,
      ];

      const proc = spawn("rsync", args, { shell: false });

      let stderr = "";

      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (tempKeyPath && fs.existsSync(tempKeyPath)) {
          fs.unlinkSync(tempKeyPath);
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `rsync failed with code ${code}`));
        }
      });

      proc.on("error", (error) => {
        if (tempKeyPath && fs.existsSync(tempKeyPath)) {
          fs.unlinkSync(tempKeyPath);
        }
        reject(error);
      });
    });
  }

  async writeRemoteFile(params: {
    connection: ServerConnection;
    remotePath: string;
    content: string;
  }): Promise<void> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-file-"));
    const fileName = path.basename(params.remotePath);
    const localTempFile = path.join(tempDir, fileName);

    fs.writeFileSync(localTempFile, params.content);

    try {
      const remoteDir = path.dirname(params.remotePath);
      await this.syncDirectory(tempDir, remoteDir, params.connection);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
