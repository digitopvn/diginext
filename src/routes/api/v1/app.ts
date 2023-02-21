import express from "express";

import AppController from "@/controllers/AppController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new AppController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.read.bind(controller)).bind(controller)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.create.bind(controller)).bind(controller)
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.update.bind(controller)).bind(controller)
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.delete.bind(controller)).bind(controller)
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.apiRespond(controller.empty.bind(controller)).bind(controller)
	)
	.delete(
		"/environment",
		authenticate,
		// authorize,
		controller.apiRespond(controller.deleteEnvironment.bind(controller)).bind(controller)
	);

export default router;
