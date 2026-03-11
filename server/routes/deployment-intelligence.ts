import express from "express";
import { DeploymentIntelligenceAgent } from "../../src/deployment-intelligence/deployment-intelligence-agent";

const router = express.Router();

router.post("/deployment-intelligence", async (req, res) => {

  try {

    const { projectPath } = req.body;

    const agent = new DeploymentIntelligenceAgent();

    const result = await agent.analyze(projectPath);

    return res.json({
      status: "success",
      deployment: result.recommendation,
      analysis: result.analysis
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      status: "error"
    });

  }

});

export default router;
