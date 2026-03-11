import express from "express";
import { DevopsAgent } from "../../src/devops/devops-agent";
import { DevopsMonitorAgent } from "../../src/devops/devops-monitor-agent";
import { DevopsMonitorFeedAgent } from "../../src/devops/devops-monitor-feed-agent";

const router = express.Router();

router.post("/devops-scan", async (req, res) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath is required"
      });
    }

    const agent = new DevopsAgent();
    const result = await agent.scan(projectPath);

    let monitoring = null;
    let latestEvent = null;
    let feed: any[] = [];

    try {
      const monitorAgent = new DevopsMonitorAgent();
      const feedAgent = new DevopsMonitorFeedAgent();

      monitoring = await monitorAgent.compareAndStore(projectPath, result);
      latestEvent = feedAgent.appendEvent(projectPath, result, monitoring);
      feed = feedAgent.getEvents(projectPath);
    } catch (monitorError) {
      console.error("DevOps monitoring failed:", monitorError);
    }

    return res.json({
      status: "success",
      devops: result,
      monitoring,
      latestEvent,
      feed
    });
  } catch (error) {
    console.error("DevOps scan failed:", error);

    return res.status(500).json({
      status: "error",
      message: "DevOps scan failed"
    });
  }
});

export default router;
