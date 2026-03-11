import express from "express";
import { DevopsReadinessAgent } from "../../src/devops/devops-readiness-agent";

const router = express.Router();

router.post("/devops-readiness", async (req, res) => {

  try {

    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        status: "error",
        message: "projectPath required"
      });
    }

    const agent = new DevopsReadinessAgent();

    const readiness = await agent.evaluate(projectPath);

    return res.json({
      status: "success",
      readiness
    });

  } catch (error) {

    console.error("Readiness failed", error);

    return res.status(500).json({
      status: "error"
    });
  }
});

export default router;
