import express from "express";

const router = express.Router();

router.post("/engine/rollback", async (req, res) => {
  try {
    const { projectId, checkpointId } = req.body;

    if (!projectId || !checkpointId) {
      return res.status(400).json({
        status: "error",
        message: "projectId and checkpointId are required"
      });
    }

    return res.json({
      status: "success",
      projectId,
      checkpointId
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Rollback failed"
    });
  }
});

export default router;
