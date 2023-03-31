import express from "express";

import WorkspaceController from "@/controllers/WorkspaceController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = express.Router();

const controller = new WorkspaceController();

router
	.use(authenticate, authorize)
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read.bind(controller)))
	.post("/", controller.apiRespond(controller.create.bind(controller)))
	.patch("/", controller.apiRespond(controller.update.bind(controller)))
	.delete("/", controller.apiRespond(controller.delete.bind(controller)))
	.delete("/empty", controller.apiRespond(controller.empty.bind(controller)))
	.patch("/add-user", controller.apiRespond(controller.addUser.bind(controller)))
	.get("/service_account", controller.apiRespond(controller.getServiceAccounts.bind(controller)))
	.get("/api_key", controller.apiRespond(controller.getApiKeyUsers.bind(controller)));

export default router;
