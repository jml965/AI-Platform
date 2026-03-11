import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { ServerConnection } from "./server-types";

function writeTempPrivateKey(privateKey: string): string {
  const tempPath = path.join(
    os.tmpdir(),
    `deploy_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  fs.writeFileSync(tempPath, privateKey, { mode: 0o600 });
  return tempPath;
}

export class SshClient {
  async exec(connection: ServerConnection, command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const port = connection.port || 22;
      const target = `${connection.username}@${connection.host}`;

      const args = ["-p", String(port), "-o", "StrictHostKeyChecking=no"];

      let tempKeyPath: string | null = null;

      if (connection.privateKey) {
        tempKeyPath = writeTempPrivateKey(connection.privateKey);
        args.push("-i", tempKeyPath);
      }

      args.push(target, command);

      const proc = spawn("ssh", args, { shell: false });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d) => {
        stdout += d.toString();
      });

      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (tempKeyPath && fs.existsSync(tempKeyPath)) {
          fs.unlinkSync(tempKeyPath);
        }

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(stderr || `SSH command failed with code ${code}`));
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
}
