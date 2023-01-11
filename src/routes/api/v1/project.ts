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
		controller.read.bind(controller)
	)
	.get(
		"/with-apps",
		authenticate,
		// authorize,
		controller.getProjectsAndApps.bind(controller)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.create.bind(controller)
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.update.bind(controller)
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.softDelete.bind(controller)
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.empty.bind(controller)
	);

export default router;
