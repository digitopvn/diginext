import express from "express";

import UserController from "@/controllers/UserController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new UserController();

router
	.use(authenticate)
	.patch("/join-workspace", processApiRequest(controller.joinWorkspace.bind(controller)))
	.use(authorize)
	.use(registerController(controller))
	.get("/profile", processApiRequest(controller.profile.bind(controller)))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	// .delete("/empty", processApiRequest(controller.empty.bind(controller)))
	.patch("/assign-role", processApiRequest(controller.assignRole.bind(controller)));

export default router;
