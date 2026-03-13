import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { snapshotsTable, projectFilesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireProjectAccess } from "../middlewares/permissions";

const router: IRouter = Router();

interface SnapshotFileData {
  filePath: string;
  content: string;
  fileType: string;
}

router.get("/projects/:projectId/snapshots", requireProjectAccess("project.view"), async (req, res) => {
  try {
    const snapshots = await db
      .select()
      .from(snapshotsTable)
      .where(eq(snapshotsTable.projectId, req.params.projectId))
      .orderBy(desc(snapshotsTable.createdAt));

    res.json({
      data: snapshots.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        label: s.label,
        description: s.description,
        fileCount: Array.isArray(s.filesData) ? (s.filesData as SnapshotFileData[]).length : 0,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to list snapshots" } });
  }
});

router.post("/projects/:projectId/snapshots", requireProjectAccess("project.edit"), async (req, res) => {
  try {
    const { label, description } = req.body;
    if (!label || typeof label !== "string" || label.trim().length === 0) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "label is required" } });
      return;
    }
    if (label.length > 200) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "label must be 200 characters or less" } });
      return;
    }
    if (description && typeof description === "string" && description.length > 1000) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "description must be 1000 characters or less" } });
      return;
    }

    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, req.params.projectId));

    const filesData: SnapshotFileData[] = files.map((f) => ({
      filePath: f.filePath,
      content: f.content,
      fileType: f.fileType,
    }));

    const [snapshot] = await db
      .insert(snapshotsTable)
      .values({
        projectId: req.params.projectId,
        label,
        description: description || null,
        filesData,
      })
      .returning();

    res.status(201).json({
      id: snapshot.id,
      projectId: snapshot.projectId,
      label: snapshot.label,
      description: snapshot.description,
      filesData,
      createdAt: snapshot.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to create snapshot" } });
  }
});

router.get("/projects/:projectId/snapshots/:snapshotId", requireProjectAccess("project.view"), async (req, res) => {
  try {
    const [snapshot] = await db
      .select()
      .from(snapshotsTable)
      .where(
        and(
          eq(snapshotsTable.id, req.params.snapshotId),
          eq(snapshotsTable.projectId, req.params.projectId)
        )
      )
      .limit(1);

    if (!snapshot) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Snapshot not found" } });
      return;
    }

    res.json({
      id: snapshot.id,
      projectId: snapshot.projectId,
      label: snapshot.label,
      description: snapshot.description,
      filesData: snapshot.filesData,
      createdAt: snapshot.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get snapshot" } });
  }
});

router.delete("/projects/:projectId/snapshots/:snapshotId", requireProjectAccess("project.edit"), async (req, res) => {
  try {
    const [deleted] = await db
      .delete(snapshotsTable)
      .where(
        and(
          eq(snapshotsTable.id, req.params.snapshotId),
          eq(snapshotsTable.projectId, req.params.projectId)
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Snapshot not found" } });
      return;
    }

    res.json({ success: true, message: "Snapshot deleted" });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to delete snapshot" } });
  }
});

router.post("/projects/:projectId/snapshots/:snapshotId/restore", requireProjectAccess("project.edit"), async (req, res) => {
  try {
    const [snapshot] = await db
      .select()
      .from(snapshotsTable)
      .where(
        and(
          eq(snapshotsTable.id, req.params.snapshotId),
          eq(snapshotsTable.projectId, req.params.projectId)
        )
      )
      .limit(1);

    if (!snapshot) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Snapshot not found" } });
      return;
    }

    const snapshotFiles = snapshot.filesData as SnapshotFileData[];

    await db.transaction(async (tx) => {
      await tx.delete(projectFilesTable).where(eq(projectFilesTable.projectId, req.params.projectId));

      if (snapshotFiles.length > 0) {
        await tx.insert(projectFilesTable).values(
          snapshotFiles.map((f) => ({
            projectId: req.params.projectId,
            filePath: f.filePath,
            content: f.content,
            fileType: f.fileType,
            version: 1,
          }))
        );
      }
    });

    res.json({ success: true, message: "Snapshot restored" });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to restore snapshot" } });
  }
});

router.get("/projects/:projectId/snapshots/:snapshotId/compare", requireProjectAccess("project.view"), async (req, res) => {
  try {
    const [snapshot] = await db
      .select()
      .from(snapshotsTable)
      .where(
        and(
          eq(snapshotsTable.id, req.params.snapshotId),
          eq(snapshotsTable.projectId, req.params.projectId)
        )
      )
      .limit(1);

    if (!snapshot) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Snapshot not found" } });
      return;
    }

    const currentFiles = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, req.params.projectId));

    const snapshotFiles = snapshot.filesData as SnapshotFileData[];

    const snapshotMap = new Map(snapshotFiles.map((f) => [f.filePath, f]));
    const currentMap = new Map(currentFiles.map((f) => [f.filePath, f]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: { filePath: string; snapshotContent: string; currentContent: string }[] = [];
    const unchanged: string[] = [];

    for (const [path, file] of currentMap) {
      const snapshotFile = snapshotMap.get(path);
      if (!snapshotFile) {
        added.push(path);
      } else if (snapshotFile.content !== file.content) {
        modified.push({
          filePath: path,
          snapshotContent: snapshotFile.content,
          currentContent: file.content,
        });
      } else {
        unchanged.push(path);
      }
    }

    for (const path of snapshotMap.keys()) {
      if (!currentMap.has(path)) {
        removed.push(path);
      }
    }

    res.json({ added, removed, modified, unchanged });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to compare snapshot" } });
  }
});

export default router;
