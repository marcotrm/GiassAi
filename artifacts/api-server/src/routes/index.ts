import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import chatRouter from "./chat.js";
import projectsRouter from "./projects.js";
import gestionaliRouter from "./gestionali.js";
import workflowsRouter from "./workflows.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(projectsRouter);
router.use(gestionaliRouter);
router.use(workflowsRouter);

export default router;
