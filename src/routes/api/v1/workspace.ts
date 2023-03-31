import express from "express";

import WorkspaceController from "@/controllers/WorkspaceController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";

const router = express.Router();

const controller = new WorkspaceController();

router
	.use(authenticate, authorize)
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.delete("/empty", processApiRequest(controller.empty.bind(controller)))
	.patch("/add-user", processApiRequest(controller.addUser.bind(controller)))
	.get("/service_account", processApiRequest(controller.getServiceAccounts.bind(controller)))
	.get("/api_key", processApiRequest(controller.getApiKeyUsers.bind(controller)));

export default router;
