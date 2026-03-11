import { spawn } from "child_process";

export class ContainerRunner {
  async run(projectPath: string, port: number) {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        "docker",
        [
          "run",
          "-d",
          "-p",
          `${port}:80`,
          projectPath
        ],
        { shell: true }
      );

      let output = "";

      proc.stdout.on("data", (d) => {
        output += d.toString();
      });

      proc.stderr.on("data", (d) => {
        output += d.toString();
      });

      proc.on("close", () => {
        resolve({
          containerId: output.trim(),
          port
        });
      });

      proc.on("error", reject);
    });
  }
}
