import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import buildRouter from "./build";
import agentsRouter from "./agents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(buildRouter);
router.use(agentsRouter);

export default router;
