// FILE: src/lib/run-workspace-manager.ts

import fs from "fs/promises"
import path from "path"

export class RunWorkspaceManager {

  async ensureDir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async create(runId: string) {
    const workspaceRoot = path.resolve(process.cwd(), ".ai-runs", runId)
    await this.ensureDir(workspaceRoot)
    return workspaceRoot
  }

  async writeFiles(
    workspaceRoot: string,
    files: Array<{ path: string; content: string }>
  ) {
    for (const file of files) {
      const fullPath = path.join(workspaceRoot, file.path)
      const dir = path.dirname(fullPath)
      await this.ensureDir(dir)
      await fs.writeFile(fullPath, file.content, "utf8")
    }
  }

  async exists(workspaceRoot: string) {
    try {
      await fs.access(workspaceRoot)
      return true
    } catch {
      return false
    }
  }

  resolvePath(workspaceRoot: string, relativePath: string) {
    return path.join(workspaceRoot, relativePath)
  }

}