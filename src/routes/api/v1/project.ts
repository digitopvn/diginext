import express from "express";

import ProjectController from "@/controllers/ProjectController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new ProjectController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.read.bind(controller))
		// controller.read.bind(controller)
	)
	.get(
		"/with-apps",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getProjectsAndApps.bind(controller))
		// controller.getProjectsAndApps.bind(controller)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		// controller.create.bind(controller)
		controller.apiRespond(controller.create.bind(controller))
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		// controller.update.bind(controller)
		controller.apiRespond(controller.update.bind(controller))
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		// controller.softDelete.bind(controller)
		controller.apiRespond(controller.softDelete.bind(controller))
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		// controller.empty.bind(controller)
		controller.apiRespond(controller.empty.bind(controller))
	);

export default router;
