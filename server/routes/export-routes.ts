import type { Express } from "express";
import fs from "fs";
import path from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream";
import { promisify } from "util";

const pipe = promisify(pipeline);

function collectFiles(dir: string, base: string = ""): Array<{ relPath: string; absPath: string }> {
  const results: Array<{ relPath: string; absPath: string }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(abs, rel));
    } else {
      results.push({ relPath: rel, absPath: abs });
    }
  }
  return results;
}

function buildTarBuffer(files: Array<{ relPath: string; content: Buffer }>): Buffer {
  const blocks: Buffer[] = [];

  for (const file of files) {
    const nameBytes = Buffer.from(file.relPath, "utf-8");
    const header = Buffer.alloc(512, 0);

    nameBytes.copy(header, 0, 0, Math.min(nameBytes.length, 100));

    const sizeStr = file.content.length.toString(8).padStart(11, "0");
    header.write("0000644\0", 100); // mode
    header.write("0001000\0", 108); // uid
    header.write("0001000\0", 116); // gid
    header.write(sizeStr + "\0", 124); // size
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0");
    header.write(mtime + "\0", 136); // mtime
    header.write("        ", 148); // checksum placeholder
    header[156] = 0x30; // type '0' = regular file

    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148);

    blocks.push(header);
    blocks.push(file.content);

    const remainder = 512 - (file.content.length % 512);
    if (remainder < 512) {
      blocks.push(Buffer.alloc(remainder, 0));
    }
  }

  blocks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(blocks);
}

export function registerExportRoutes(app: Express) {
  app.get("/api/project/:projectId/export", async (req, res) => {
    const projectId = req.params.projectId;
    const deployDir = path.join(process.cwd(), ".deployments", projectId);
    const aiRunDir = path.join(process.cwd(), ".ai-runs", projectId);

    let sourceDir = "";
    if (fs.existsSync(deployDir)) {
      sourceDir = deployDir;
    } else if (fs.existsSync(aiRunDir)) {
      sourceDir = aiRunDir;
    }

    if (!sourceDir) {
      return res.status(404).json({
        success: false,
        message: "لا توجد ملفات للتصدير. قم بإنشاء مشروع وتشغيله أولاً."
      });
    }

    const diskFiles = collectFiles(sourceDir);
    if (diskFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "مجلد المشروع فارغ."
      });
    }

    const tarFiles = diskFiles.map(f => ({
      relPath: f.relPath,
      content: fs.readFileSync(f.absPath)
    }));

    const tarBuffer = buildTarBuffer(tarFiles);

    const { createGzip: gz } = await import("zlib");
    const gzipped = await new Promise<Buffer>((resolve, reject) => {
      const gzip = gz();
      const chunks: Buffer[] = [];
      gzip.on("data", (chunk: Buffer) => chunks.push(chunk));
      gzip.on("end", () => resolve(Buffer.concat(chunks)));
      gzip.on("error", reject);
      gzip.end(tarBuffer);
    });

    const safeName = `project-${projectId.slice(0, 8)}`;
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.tar.gz"`);
    res.setHeader("Content-Length", gzipped.length);
    res.end(gzipped);
  });

  app.get("/api/project/:projectId/export/files", (req, res) => {
    const projectId = req.params.projectId;
    const deployDir = path.join(process.cwd(), ".deployments", projectId);
    const aiRunDir = path.join(process.cwd(), ".ai-runs", projectId);

    let sourceDir = "";
    if (fs.existsSync(deployDir)) {
      sourceDir = deployDir;
    } else if (fs.existsSync(aiRunDir)) {
      sourceDir = aiRunDir;
    }

    if (!sourceDir) {
      return res.json({ success: true, files: [] });
    }

    const diskFiles = collectFiles(sourceDir);
    const files = diskFiles.map(f => ({
      path: f.relPath,
      size: fs.statSync(f.absPath).size,
      content: fs.readFileSync(f.absPath, "utf-8"),
    }));

    return res.json({ success: true, files });
  });
}
