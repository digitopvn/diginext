import express from "express";

import GitProviderController from "@/controllers/GitProviderController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = express.Router();

const controller = new GitProviderController();

router
	.use(authenticate, authorize)
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read.bind(controller)))
	.post("/", controller.apiRespond(controller.create.bind(controller)))
	.patch("/", controller.apiRespond(controller.update.bind(controller)))
	.delete("/", controller.apiRespond(controller.delete.bind(controller)))
	.get("/ssh/public-key", controller.apiRespond(controller.getPublicKey.bind(controller)))
	.post("/ssh/create", controller.apiRespond(controller.createKeysSSH.bind(controller)))
	.post("/ssh/generate", controller.apiRespond(controller.generateSSH.bind(controller)))
	.post("/ssh/verify", controller.apiRespond(controller.verifySSH.bind(controller)))
	.delete("/empty", controller.apiRespond(controller.empty.bind(controller)));

export default router;
