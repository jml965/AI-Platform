import { db } from "@workspace/db";
import { deploymentsTable, projectsTable, projectFilesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createSandbox, executeCommand, stopSandbox } from "./sandbox/sandbox-manager";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const connectors = new ReplitConnectors();

function generateRepoName(projectName: string, projectId: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const shortId = projectId.slice(0, 8);
  return slug ? `${slug}-${shortId}` : `site-${shortId}`;
}

async function githubApi(path: string, options: { method?: string; body?: any } = {}) {
  const res = await connectors.proxy("github", path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404 && res.status !== 422) {
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function getGitHubUsername(): Promise<string> {
  const { data } = await githubApi("/user");
  return data.login;
}

async function ensureRepo(repoName: string): Promise<{ owner: string; repo: string; created: boolean }> {
  const owner = await getGitHubUsername();

  const check = await githubApi(`/repos/${owner}/${repoName}`);
  if (check.status === 200) {
    return { owner, repo: repoName, created: false };
  }

  await githubApi("/user/repos", {
    method: "POST",
    body: {
      name: repoName,
      description: "Deployed via Mr Code AI",
      homepage: `https://${owner}.github.io/${repoName}`,
      auto_init: true,
      private: false,
    },
  });

  return { owner, repo: repoName, created: true };
}


async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const refMain = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/main`);
  if (refMain.status === 200) return "main";
  const refMaster = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/master`);
  if (refMaster.status === 200) return "master";
  return "main";
}

async function enableGitHubPages(owner: string, repo: string) {
  const pagesCheck = await githubApi(`/repos/${owner}/${repo}/pages`);
  if (pagesCheck.status === 200) {
    return;
  }

  const branch = await getDefaultBranch(owner, repo);
  await githubApi(`/repos/${owner}/${repo}/pages`, {
    method: "POST",
    body: {
      source: { branch, path: "/" },
    },
  });
}

function isReactViteProject(files: { filePath: string; content: string | null }[]): boolean {
  const hasViteConfig = files.some(f =>
    f.filePath === "vite.config.ts" || f.filePath === "vite.config.js"
  );
  const hasIndexHtml = files.some(f => f.filePath === "index.html");

  if (!hasViteConfig && !hasIndexHtml) return false;

  const pkgFile = files.find(f => f.filePath === "package.json");
  if (!pkgFile?.content) return false;
  try {
    const pkg = JSON.parse(pkgFile.content);
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return !!allDeps.vite || !!allDeps["@vitejs/plugin-react"];
  } catch {
    return false;
  }
}

function isStaticProject(files: { filePath: string; content: string | null }[]): boolean {
  const hasIndexHtml = files.some(f => f.filePath === "index.html");
  const hasViteConfig = files.some(f =>
    f.filePath === "vite.config.ts" || f.filePath === "vite.config.js"
  );
  return hasIndexHtml && !hasViteConfig;
}

function collectDistFiles(distDir: string, basePath = ""): { filePath: string; content: string }[] {
  const result: { filePath: string; content: string }[] = [];
  if (!existsSync(distDir)) return result;

  const entries = readdirSync(distDir);
  for (const entry of entries) {
    const fullPath = join(distDir, entry);
    const relativePath = basePath ? `${basePath}/${entry}` : entry;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...collectDistFiles(fullPath, relativePath));
    } else {
      try {
        result.push({ filePath: relativePath, content: readFileSync(fullPath, "utf-8") });
      } catch {}
    }
  }
  return result;
}

async function buildProjectInSandbox(
  projectId: string,
  files: { filePath: string; content: string | null }[],
  repoName: string
): Promise<{ filePath: string; content: string }[]> {
  console.log(`[Deploy] Building project ${projectId} in sandbox...`);

  const { id: sandboxId } = await createSandbox(projectId, "node", 1024, 180, "deploy-system");
  const sandboxDir = `/tmp/sandboxes/${sandboxId}`;

  try {
    console.log(`[Deploy] Installing dependencies...`);
    const installResult = await executeCommand(sandboxId, "npm install --legacy-peer-deps 2>&1");
    if (installResult.exitCode !== 0) {
      console.warn(`[Deploy] npm install warning (code ${installResult.exitCode}): ${installResult.output.slice(-200)}`);
    }

    console.log(`[Deploy] Running vite build with base /${repoName}/...`);
    const buildResult = await executeCommand(sandboxId, `npx vite build --base=/${repoName}/ 2>&1`);
    if (buildResult.exitCode !== 0) {
      console.error(`[Deploy] Build failed: ${buildResult.output.slice(-500)}`);
      throw new Error(`Build failed: ${buildResult.output.slice(-200)}`);
    }

    console.log(`[Deploy] Build succeeded, collecting dist files...`);
    const distDir = join(sandboxDir, "dist");

    const distFiles = collectDistFiles(distDir);
    if (distFiles.length === 0) {
      throw new Error("Build produced no output files in dist/");
    }

    console.log(`[Deploy] Collected ${distFiles.length} built files`);
    return distFiles;
  } finally {
    try {
      await stopSandbox(sandboxId);
    } catch {}
  }
}

async function getDeployableFiles(
  projectId: string,
  files: { filePath: string; content: string | null }[],
  repoName: string
): Promise<{ filePath: string; content: string }[]> {
  if (isReactViteProject(files)) {
    console.log(`[Deploy] Detected React+Vite project, building before deploy...`);
    try {
      return await buildProjectInSandbox(projectId, files, repoName);
    } catch (buildErr) {
      console.error(`[Deploy] Build failed, deploying source files as fallback:`, buildErr);
    }
  } else if (isStaticProject(files)) {
    console.log(`[Deploy] Detected static HTML project, deploying as-is`);
  } else {
    console.log(`[Deploy] Non-frontend project (backend/fullstack), deploying source files`);
  }

  return files.map(f => ({
    filePath: f.filePath,
    content: f.content ?? "",
  }));
}

async function pushFilesToGitHub(
  owner: string,
  repo: string,
  files: { filePath: string; content: string }[]
) {
  const refRes = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/main`);
  let baseSha: string;

  if (refRes.status === 200) {
    baseSha = refRes.data.object.sha;
  } else {
    const masterRef = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/master`);
    if (masterRef.status === 200) {
      baseSha = masterRef.data.object.sha;
    } else {
      throw new Error("Could not find default branch");
    }
  }

  console.log(`[Deploy] Uploading ${files.length} files as individual blobs...`);

  const BATCH_SIZE = 5;
  const treeItems: any[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async f => {
        const blobRes = await githubApi(`/repos/${owner}/${repo}/git/blobs`, {
          method: "POST",
          body: {
            content: Buffer.from(f.content, "utf-8").toString("base64"),
            encoding: "base64",
          },
        });

        return {
          path: f.filePath.replace(/^\//, ""),
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobRes.data.sha,
        };
      })
    );
    treeItems.push(...batchResults);
    if (i + BATCH_SIZE < files.length) {
      console.log(`[Deploy] Uploaded ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} blobs...`);
    }
  }

  console.log(`[Deploy] All ${files.length} blobs uploaded, creating tree...`);

  const treeRes = await githubApi(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: { tree: treeItems },
  });

  const commitRes = await githubApi(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: {
      message: `Deploy from Mr Code AI - ${new Date().toISOString()}`,
      tree: treeRes.data.sha,
      parents: [baseSha],
    },
  });

  const updateRefPath = refRes.status === 200
    ? `/repos/${owner}/${repo}/git/refs/heads/main`
    : `/repos/${owner}/${repo}/git/refs/heads/master`;

  await githubApi(updateRefPath, {
    method: "PATCH",
    body: { sha: commitRes.data.sha, force: true },
  });

  console.log(`[Deploy] Files pushed to ${owner}/${repo} successfully`);
}

export async function deployProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!project) throw new Error("Project not found");
  if (project.userId !== userId) throw new Error("Access denied");

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  if (files.length === 0) throw new Error("No files found in project to deploy");

  const [existing] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .limit(1);

  const repoName = existing?.subdomain || generateRepoName(project.name, projectId);

  const deployableFiles = await getDeployableFiles(projectId, files, repoName);

  if (existing) {
    const newVersion = (existing.version ?? 1) + 1;
    await db
      .update(deploymentsTable)
      .set({ status: "deploying", version: newVersion, lastDeployedAt: new Date(), updatedAt: new Date() })
      .where(eq(deploymentsTable.id, existing.id));

    try {
      const { owner, repo } = await ensureRepo(repoName);
      await pushFilesToGitHub(owner, repo, deployableFiles);
      await enableGitHubPages(owner, repo);

      const url = `https://${owner}.github.io/${repo}`;
      const [updated] = await db
        .update(deploymentsTable)
        .set({ status: "active", url, updatedAt: new Date() })
        .where(eq(deploymentsTable.id, existing.id))
        .returning();

      return { ...updated, projectName: project.name };
    } catch (err) {
      console.error("Deploy failed:", err);
      await db
        .update(deploymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(deploymentsTable.id, existing.id));
      throw new Error(`Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId,
      userId,
      subdomain: repoName,
      url: "",
      status: "deploying",
      version: 1,
      lastDeployedAt: new Date(),
    })
    .returning();

  try {
    const { owner, repo } = await ensureRepo(repoName);
    await pushFilesToGitHub(owner, repo, deployableFiles);
    await enableGitHubPages(owner, repo);

    const url = `https://${owner}.github.io/${repo}`;
    const [updated] = await db
      .update(deploymentsTable)
      .set({ status: "active", url, updatedAt: new Date() })
      .where(eq(deploymentsTable.id, deployment.id))
      .returning();

    return { ...updated, projectName: project.name };
  } catch (err) {
    console.error("Deploy failed:", err);
    await db
      .update(deploymentsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(deploymentsTable.id, deployment.id));
    throw new Error(`Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function undeployProject(projectId: string, userId: string) {
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .limit(1);

  if (!deployment) throw new Error("No deployment found for this project");
  if (deployment.userId !== userId) throw new Error("Access denied");

  await db
    .update(deploymentsTable)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(deploymentsTable.id, deployment.id));

  return { success: true, message: "Project undeployed successfully" };
}

export async function redeployProject(projectId: string, userId: string) {
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .limit(1);

  if (!deployment) throw new Error("No deployment found. Deploy the project first.");
  if (deployment.userId !== userId) throw new Error("Access denied");

  return deployProject(projectId, userId);
}

export async function getDeploymentStatus(projectId: string, userId: string) {
  const [deployment] = await db
    .select({
      id: deploymentsTable.id,
      projectId: deploymentsTable.projectId,
      subdomain: deploymentsTable.subdomain,
      url: deploymentsTable.url,
      status: deploymentsTable.status,
      version: deploymentsTable.version,
      lastDeployedAt: deploymentsTable.lastDeployedAt,
      createdAt: deploymentsTable.createdAt,
      projectName: projectsTable.name,
    })
    .from(deploymentsTable)
    .innerJoin(projectsTable, eq(deploymentsTable.projectId, projectsTable.id))
    .where(and(eq(deploymentsTable.projectId, projectId), eq(deploymentsTable.userId, userId)))
    .limit(1);

  return deployment || null;
}

export async function listUserDeployments(userId: string) {
  const deployments = await db
    .select({
      id: deploymentsTable.id,
      projectId: deploymentsTable.projectId,
      subdomain: deploymentsTable.subdomain,
      url: deploymentsTable.url,
      status: deploymentsTable.status,
      version: deploymentsTable.version,
      lastDeployedAt: deploymentsTable.lastDeployedAt,
      createdAt: deploymentsTable.createdAt,
      projectName: projectsTable.name,
    })
    .from(deploymentsTable)
    .innerJoin(projectsTable, eq(deploymentsTable.projectId, projectsTable.id))
    .where(eq(deploymentsTable.userId, userId));

  return deployments;
}
