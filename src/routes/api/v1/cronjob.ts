import express from "express";

import CronjobController from "@/controllers/CronjobController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new CronjobController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.post("/schedule-at", processApiRequest(controller.scheduleAt.bind(controller)))
	.post("/schedule-repeat", processApiRequest(controller.scheduleRepeat.bind(controller)))
	.delete("/cancel", processApiRequest(controller.cancelCronjob.bind(controller)));

export default router;
