import express from "express";
import { SecurityAgent } from "../../src/security/security-agent";
import { SecurityMonitorAgent } from "../../src/security/security-monitor-agent";
import { SecurityMonitorFeedAgent } from "../../src/security/security-monitor-feed-agent";
import { analyzeSecurityWithAI } from "../../src/security/security-ai-analyzer";

const router = express.Router();

router.post("/security-scan", async (req, res) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath is required"
      });
    }

    const agent = new SecurityAgent();
    const result = await agent.scan(projectPath);

    let monitoring = null;
    let latestEvent = null;
    let feed: any[] = [];
    let aiAnalysis = null;

    try {
      const monitorAgent = new SecurityMonitorAgent();
      const feedAgent = new SecurityMonitorFeedAgent();

      monitoring = await monitorAgent.compareAndStore(projectPath, result);
      latestEvent = feedAgent.appendEvent(projectPath, result, monitoring);
      feed = feedAgent.getEvents(projectPath);
    } catch (monitorError) {
      console.error("Security monitoring failed:", monitorError);
    }

    try {
      aiAnalysis = await analyzeSecurityWithAI(result);
    } catch (aiError) {
      console.error("Security AI analysis failed:", aiError);
    }

    return res.json({
      status: "success",
      security: result,
      monitoring,
      latestEvent,
      feed,
      aiAnalysis
    });
  } catch (error) {
    console.error("Security scan failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Security scan failed"
    });
  }
});

export default router;
