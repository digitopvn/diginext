import express from "express";

import RoleController from "@/controllers/RoleController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new RoleController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", authenticate, controller.apiRespond(controller.read.bind(controller)))
	.post("/", authenticate, controller.apiRespond(controller.create.bind(controller)))
	.patch("/", authenticate, controller.apiRespond(controller.update.bind(controller)))
	.delete("/", authenticate, controller.apiRespond(controller.delete.bind(controller)))
	.delete("/empty", authenticate, controller.apiRespond(controller.empty.bind(controller)))
	.post("/assign", authenticate, controller.apiRespond(controller.assign.bind(controller)));

export default router;
