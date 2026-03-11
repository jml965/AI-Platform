// FILE: src/lib/file-manager.ts

import fs from "fs/promises"
import path from "path"

export class FileManager {

  async ensureDir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async writeFile(filePath: string, content: string) {
    const fullPath = path.resolve(process.cwd(), filePath)
    const dir = path.dirname(fullPath)
    await this.ensureDir(dir)
    await fs.writeFile(fullPath, content, "utf8")
  }

  async writeFiles(files: { path: string; content: string }[]) {
    for (const file of files) {
      await this.writeFile(file.path, file.content)
    }
  }

}