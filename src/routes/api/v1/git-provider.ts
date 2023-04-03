import express from "express";

import GitProviderController from "@/controllers/GitProviderController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new GitProviderController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.get("/ssh/public-key", processApiRequest(controller.getPublicKey.bind(controller)))
	.post("/ssh/create", processApiRequest(controller.createKeysSSH.bind(controller)))
	.post("/ssh/generate", processApiRequest(controller.generateSSH.bind(controller)))
	.post("/ssh/verify", processApiRequest(controller.verifySSH.bind(controller)))
	.delete("/empty", processApiRequest(controller.empty.bind(controller)));

export default router;
