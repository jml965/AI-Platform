import { db } from "@workspace/db";
import { deploymentsTable, projectsTable, projectFilesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || "platform.app";

function generateSubdomain(projectName: string, projectId: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const shortId = projectId.slice(0, 8);
  return slug ? `${slug}-${shortId}` : shortId;
}

export async function deployProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.userId !== userId) {
    throw new Error("Access denied");
  }

  if (project.status !== "ready") {
    throw new Error("Project must be in 'ready' status to deploy");
  }

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  if (files.length === 0) {
    throw new Error("No files found in project to deploy");
  }

  const [existing] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .limit(1);

  if (existing) {
    const newVersion = (existing.version ?? 1) + 1;
    const [updated] = await db
      .update(deploymentsTable)
      .set({
        status: "deploying",
        version: newVersion,
        lastDeployedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, existing.id))
      .returning();

    setTimeout(async () => {
      try {
        await db
          .update(deploymentsTable)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(deploymentsTable.id, existing.id));
      } catch (err) {
        console.error("Failed to finalize deployment:", err);
        await db
          .update(deploymentsTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(deploymentsTable.id, existing.id));
      }
    }, 2000);

    return {
      ...updated,
      projectName: project.name,
    };
  }

  const subdomain = generateSubdomain(project.name, projectId);
  const url = `https://${subdomain}.${PLATFORM_DOMAIN}`;

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId,
      userId,
      subdomain,
      url,
      status: "deploying",
      version: 1,
      lastDeployedAt: new Date(),
    })
    .returning();

  setTimeout(async () => {
    try {
      await db
        .update(deploymentsTable)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(deploymentsTable.id, deployment.id));
    } catch (err) {
      console.error("Failed to finalize deployment:", err);
      await db
        .update(deploymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(deploymentsTable.id, deployment.id));
    }
  }, 2000);

  return {
    ...deployment,
    projectName: project.name,
  };
}

export async function undeployProject(projectId: string, userId: string) {
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .limit(1);

  if (!deployment) {
    throw new Error("No deployment found for this project");
  }

  if (deployment.userId !== userId) {
    throw new Error("Access denied");
  }

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

  if (!deployment) {
    throw new Error("No deployment found. Deploy the project first.");
  }

  if (deployment.userId !== userId) {
    throw new Error("Access denied");
  }

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

  if (!deployment) {
    return null;
  }

  return deployment;
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
