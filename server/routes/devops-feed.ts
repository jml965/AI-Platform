import express from "express";
import { DevopsMonitorFeedAgent } from "../../src/devops/devops-monitor-feed-agent";

const router = express.Router();

router.get("/devops-feed", async (req, res) => {
  try {
    const projectPath = String(req.query.projectPath ?? "");

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath is required"
      });
    }

    const feedAgent = new DevopsMonitorFeedAgent();

    return res.json({
      status: "success",
      feed: feedAgent.getEvents(projectPath)
    });
  } catch (error) {
    console.error("DevOps feed fetch failed:", error);

    return res.status(500).json({
      status: "error",
      message: "DevOps feed fetch failed"
    });
  }
});

export default router;
