import express from "express";

import RoleController from "@/controllers/RoleController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = express.Router();

const controller = new RoleController();

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
	.post("/assign", controller.apiRespond(controller.assign.bind(controller)));

export default router;
