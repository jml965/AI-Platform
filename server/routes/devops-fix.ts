import express from "express";
import { DevopsFixer } from "../../src/devops/devops-fixer";
import { DevopsAgent } from "../../src/devops/devops-agent";
import { DevopsMonitorAgent } from "../../src/devops/devops-monitor-agent";
import { DevopsMonitorFeedAgent } from "../../src/devops/devops-monitor-feed-agent";

const router = express.Router();

router.post("/devops-fix", async (req, res) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath is required"
      });
    }

    const fixer = new DevopsFixer();
    const fixResult = await fixer.apply(projectPath);

    const agent = new DevopsAgent();
    const devops = await agent.scan(projectPath);

    let monitoring = null;
    let latestEvent = null;
    let feed: any[] = [];

    try {
      const monitorAgent = new DevopsMonitorAgent();
      const feedAgent = new DevopsMonitorFeedAgent();

      monitoring = await monitorAgent.compareAndStore(projectPath, devops);
      latestEvent = feedAgent.appendEvent(projectPath, devops, monitoring);
      feed = feedAgent.getEvents(projectPath);
    } catch (monitorError) {
      console.error("DevOps monitoring after fix failed:", monitorError);
    }

    return res.json({
      status: "success",
      fixResult,
      devops,
      monitoring,
      latestEvent,
      feed
    });
  } catch (error) {
    console.error("DevOps fix failed:", error);

    return res.status(500).json({
      status: "error",
      message: "DevOps fix failed"
    });
  }
});

export default router;
