import express from "express";
import { SecurityMonitorFeedAgent } from "../../src/security/security-monitor-feed-agent";

const router = express.Router();

router.get("/security-feed", async (req, res) => {
  try {
    const projectPath = String(req.query.projectPath ?? "");

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath is required"
      });
    }

    const feedAgent = new SecurityMonitorFeedAgent();

    return res.json({
      status: "success",
      feed: feedAgent.getEvents(projectPath)
    });
  } catch (error) {
    console.error("Security feed fetch failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Security feed fetch failed"
    });
  }
});

export default router;
