import type { Express } from "express";
import fs from "fs";
import path from "path";

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

async function githubApi(endpoint: string, options: {
  method?: string;
  body?: any;
  token: string;
}) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Authorization": `token ${options.token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "AI-Platform-Builder",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  return { ok: res.ok, status: res.status, data };
}

async function ensureRepoHasCommit(repoPath: string, branchName: string, token: string): Promise<boolean> {
  const refRes = await githubApi(`/repos/${repoPath}/git/ref/heads/${branchName}`, { token });
  if (refRes.ok) return true;

  const putRes = await githubApi(`/repos/${repoPath}/contents/README.md`, {
    method: "PUT",
    token,
    body: {
      message: "Initial commit",
      content: Buffer.from(`# AI Platform Project\n`).toString("base64"),
      branch: branchName,
    }
  });

  if (!putRes.ok && putRes.status !== 422) {
    throw new Error(`Failed to initialize repo: ${putRes.data.message}`);
  }

  return true;
}

const PLATFORM_IGNORE = new Set([
  "node_modules", ".git", ".cache", "dist", ".local", ".upm", ".config",
  ".agents", ".data", ".deployments", ".ai-runs", ".replit", "replit.nix",
  "attached_assets", ".breakpoints", ".pythonlibs",
]);

function collectPlatformFiles(rootDir: string, base: string = ""): Array<{ relPath: string; absPath: string }> {
  const results: Array<{ relPath: string; absPath: string }> = [];
  if (!fs.existsSync(rootDir)) return results;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (PLATFORM_IGNORE.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectPlatformFiles(abs, rel));
    } else {
      const stat = fs.statSync(abs);
      if (stat.size > 2 * 1024 * 1024) continue;
      results.push({ relPath: rel, absPath: abs });
    }
  }
  return results;
}

export function registerGithubPushRoutes(app: Express) {
  app.post("/api/project/:projectId/push-github", async (req, res) => {
    const projectId = req.params.projectId;
    const { repo, branch, commitMessage } = req.body || {};

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "GITHUB_TOKEN غير مُعد. يرجى إضافة التوكن في متغيرات البيئة."
      });
    }

    const repoPath = repo || "jml965/AI-Platform";
    const branchName = branch || "main";
    const message = commitMessage || `تحديث ملفات المشروع ${projectId.slice(0, 8)}`;

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
        message: "لا توجد ملفات للرفع. قم بتشغيل المشروع أولاً."
      });
    }

    const diskFiles = collectFiles(sourceDir);
    if (diskFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "مجلد المشروع فارغ."
      });
    }

    try {
      await ensureRepoHasCommit(repoPath, branchName, token);

      const refRes = await githubApi(`/repos/${repoPath}/git/ref/heads/${branchName}`, { token });
      if (!refRes.ok) {
        throw new Error(`Cannot get branch ref: ${refRes.data.message}`);
      }
      const latestCommitSha = refRes.data.object.sha;

      const commitRes = await githubApi(`/repos/${repoPath}/git/commits/${latestCommitSha}`, { token });
      if (!commitRes.ok) {
        throw new Error(`Cannot get commit: ${commitRes.data.message}`);
      }
      const treeSha = commitRes.data.tree.sha;

      const treeItems: any[] = [];
      for (const file of diskFiles) {
        const content = fs.readFileSync(file.absPath);
        const base64 = content.toString("base64");

        const blobRes = await githubApi(`/repos/${repoPath}/git/blobs`, {
          method: "POST",
          token,
          body: { content: base64, encoding: "base64" }
        });

        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for ${file.relPath}: ${blobRes.data.message}`);
        }

        treeItems.push({
          path: file.relPath,
          mode: "100644",
          type: "blob",
          sha: blobRes.data.sha
        });
      }

      const newTreeRes = await githubApi(`/repos/${repoPath}/git/trees`, {
        method: "POST",
        token,
        body: { base_tree: treeSha, tree: treeItems }
      });

      if (!newTreeRes.ok) {
        throw new Error(`Failed to create tree: ${newTreeRes.data.message}`);
      }

      const newCommitRes = await githubApi(`/repos/${repoPath}/git/commits`, {
        method: "POST",
        token,
        body: {
          message,
          tree: newTreeRes.data.sha,
          parents: [latestCommitSha]
        }
      });

      if (!newCommitRes.ok) {
        throw new Error(`Failed to create commit: ${newCommitRes.data.message}`);
      }

      const updateRefRes = await githubApi(`/repos/${repoPath}/git/refs/heads/${branchName}`, {
        method: "PATCH",
        token,
        body: { sha: newCommitRes.data.sha }
      });

      if (!updateRefRes.ok) {
        throw new Error(`Failed to update ref: ${updateRefRes.data.message}`);
      }

      return res.json({
        success: true,
        message: `تم رفع ${diskFiles.length} ملفات إلى ${repoPath}`,
        commitSha: newCommitRes.data.sha,
        commitUrl: `https://github.com/${repoPath}/commit/${newCommitRes.data.sha}`,
        repoUrl: `https://github.com/${repoPath}`,
        filesCount: diskFiles.length,
      });
    } catch (err: any) {
      console.error("GitHub push error:", err);
      return res.status(500).json({
        success: false,
        message: `فشل الرفع إلى GitHub: ${err.message}`
      });
    }
  });

  app.post("/api/platform/push-github", async (req, res) => {
    const { repo, branch, commitMessage } = req.body || {};

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "GITHUB_TOKEN غير مُعد."
      });
    }

    const repoPath = repo || "jml965/AI-Platform";
    const branchName = branch || "main";
    const message = commitMessage || "رفع منصة البناء الذكي - النسخة الكاملة";

    const rootDir = process.cwd();
    const diskFiles = collectPlatformFiles(rootDir);

    if (diskFiles.length === 0) {
      return res.status(404).json({ success: false, message: "لا توجد ملفات." });
    }

    try {
      await ensureRepoHasCommit(repoPath, branchName, token);

      const refRes = await githubApi(`/repos/${repoPath}/git/ref/heads/${branchName}`, { token });
      if (!refRes.ok) throw new Error(`Cannot get branch ref: ${refRes.data.message}`);
      const latestCommitSha = refRes.data.object.sha;

      const commitRes = await githubApi(`/repos/${repoPath}/git/commits/${latestCommitSha}`, { token });
      if (!commitRes.ok) throw new Error(`Cannot get commit: ${commitRes.data.message}`);
      const treeSha = commitRes.data.tree.sha;

      const treeItems: any[] = [];
      let uploaded = 0;
      for (const file of diskFiles) {
        const content = fs.readFileSync(file.absPath);
        const base64 = content.toString("base64");

        const blobRes = await githubApi(`/repos/${repoPath}/git/blobs`, {
          method: "POST",
          token,
          body: { content: base64, encoding: "base64" }
        });

        if (!blobRes.ok) {
          console.error(`Skipping ${file.relPath}: ${blobRes.data.message}`);
          continue;
        }

        treeItems.push({
          path: file.relPath,
          mode: "100644",
          type: "blob",
          sha: blobRes.data.sha
        });
        uploaded++;
      }

      const newTreeRes = await githubApi(`/repos/${repoPath}/git/trees`, {
        method: "POST",
        token,
        body: { base_tree: treeSha, tree: treeItems }
      });
      if (!newTreeRes.ok) throw new Error(`Failed to create tree: ${newTreeRes.data.message}`);

      const newCommitRes = await githubApi(`/repos/${repoPath}/git/commits`, {
        method: "POST",
        token,
        body: { message, tree: newTreeRes.data.sha, parents: [latestCommitSha] }
      });
      if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.data.message}`);

      const updateRefRes = await githubApi(`/repos/${repoPath}/git/refs/heads/${branchName}`, {
        method: "PATCH",
        token,
        body: { sha: newCommitRes.data.sha }
      });
      if (!updateRefRes.ok) throw new Error(`Failed to update ref: ${updateRefRes.data.message}`);

      return res.json({
        success: true,
        message: `تم رفع ${uploaded} ملف من منصة البناء الذكي إلى ${repoPath}`,
        commitSha: newCommitRes.data.sha,
        commitUrl: `https://github.com/${repoPath}/commit/${newCommitRes.data.sha}`,
        repoUrl: `https://github.com/${repoPath}`,
        filesCount: uploaded,
      });
    } catch (err: any) {
      console.error("GitHub platform push error:", err);
      return res.status(500).json({
        success: false,
        message: `فشل الرفع: ${err.message}`
      });
    }
  });
}
