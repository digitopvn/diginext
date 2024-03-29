import express from "express";

import CloudDatabaseController from "@/controllers/CloudDatabaseController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new CloudDatabaseController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.get("/healthz", processApiRequest(controller.checkConnection.bind(controller)))
	.post("/backup", processApiRequest(controller.backup.bind(controller)))
	.post("/restore", processApiRequest(controller.restore.bind(controller)))
	.post("/auto-backup", processApiRequest(controller.scheduleAutoBackup.bind(controller)));
// .delete("/empty", processApiRequest(controller.empty.bind(controller)));

export default router;
