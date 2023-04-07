import express from "express";

import ProjectController from "@/controllers/ProjectController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new ProjectController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.get("/with-apps", processApiRequest(controller.getProjectsAndApps.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.softDelete.bind(controller)))
	.delete("/empty", processApiRequest(controller.empty.bind(controller)));

export default router;
