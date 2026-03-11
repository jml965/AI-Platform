// FILE: src/agents/executor-agent.ts

import { spawn } from "child_process"

export class ExecutorAgent {

  async run(command: string, cwd: string) {

    return new Promise<{
      success: boolean
      stdout: string
      stderr: string
      exitCode?: number | null
    }>((resolve) => {

      const child = spawn(command, {
        shell: true,
        cwd,
        env: process.env
      })

      let stdout = ""
      let stderr = ""
      let finished = false

      const timeoutMs = 30000

      const timer = setTimeout(() => {
        if (finished) return
        finished = true
        child.kill("SIGTERM")
        resolve({
          success: false,
          stdout,
          stderr: `${stderr}\nExecution timeout after ${timeoutMs}ms`.trim(),
          exitCode: 124
        })
      }, timeoutMs)

      child.stdout.on("data", (d) => {
        stdout += d.toString()
      })

      child.stderr.on("data", (d) => {
        stderr += d.toString()
      })

      child.on("close", (code) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        })
      })

      child.on("error", (error) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        resolve({
          success: false,
          stdout,
          stderr: error.message,
          exitCode: 1
        })
      })

    })

  }

}