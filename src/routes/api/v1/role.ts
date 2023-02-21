import express from "express";

import RoleController from "@/controllers/RoleController";

const router = express.Router();

const controller = new RoleController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read))
	.post("/", controller.apiRespond(controller.create))
	.patch("/", controller.apiRespond(controller.update))
	.delete("/", controller.apiRespond(controller.delete))
	.delete("/empty", controller.apiRespond(controller.empty));

export default router;
