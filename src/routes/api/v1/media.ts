import express from "express";

import MediaController from "@/controllers/MediaController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new MediaController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.post("/upload-to-cloud-storage", processApiRequest(controller.uploadToCloudStorage.bind(controller)));
// .delete("/empty", processApiRequest(controller.empty.bind(controller)));

export default router;
