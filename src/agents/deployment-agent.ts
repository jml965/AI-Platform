import { AppRuntimeDetector } from "../deployment/app-runtime-detector";
import { DockerfileGenerator } from "../deployment/dockerfile-generator";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export class DeploymentAgent {
  private runtimeDetector = new AppRuntimeDetector();
  private dockerfile = new DockerfileGenerator();

  private async buildAndRunLocalContainer(projectDir: string, projectId: string, port: number) {
    const imageTag = `${projectId.toLowerCase()}:latest`;

    await new Promise<void>((resolve, reject) => {
      const buildProc = spawn(
        "docker",
        ["build", "-t", imageTag, "."],
        { cwd: projectDir, shell: false }
      );

      let stderr = "";

      buildProc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      buildProc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `docker build failed with code ${code}`));
      });

      buildProc.on("error", reject);
    });

    const runResult = await new Promise<{ containerId: string }>((resolve, reject) => {
      const runProc = spawn(
        "docker",
        ["run", "-d", "--rm", "--name", projectId, "-p", `${port}:80`, imageTag],
        { shell: false }
      );

      let stdout = "";
      let stderr = "";

      runProc.stdout.on("data", (d) => {
        stdout += d.toString();
      });

      runProc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      runProc.on("close", (code) => {
        if (code === 0) {
          resolve({ containerId: stdout.trim() });
        } else {
          reject(new Error(stderr || `docker run failed with code ${code}`));
        }
      });

      runProc.on("error", reject);
    });

    return {
      containerId: runResult.containerId,
      port,
      previewUrl: `http://localhost:${port}`,
    };
  }

  async deploy(request: {
    projectId: string;
    files: Array<{ path: string; content: string }>;
  }) {
    const runtime = this.runtimeDetector.detect(request.files);

    const projectDir = path.join(process.cwd(), ".deployments", request.projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    for (const file of request.files) {
      const fullPath = path.join(projectDir, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    }

    const dockerfile = this.dockerfile.build(runtime);
    fs.writeFileSync(path.join(projectDir, "Dockerfile"), dockerfile);

    const port = 4000 + Math.floor(Math.random() * 1000);

    try {
      const result = await this.buildAndRunLocalContainer(projectDir, request.projectId, port);
      return {
        success: true,
        previewUrl: result.previewUrl,
        containerId: result.containerId,
        port,
        projectPath: projectDir,
      };
    } catch (err: any) {
      return {
        success: true,
        previewUrl: undefined,
        containerId: undefined,
        port: undefined,
        projectPath: projectDir,
        deploymentMode: "filesystem" as const,
        dockerError: err?.message || "Docker unavailable",
      };
    }
  }
}
