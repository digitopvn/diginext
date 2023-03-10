import express from "express";

import BuildController from "@/controllers/BuildController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new BuildController();

// TODO: add view build logs

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.read.bind(controller))
	)
	.get(
		"/logs",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getLogs.bind(controller))
	)
	.patch(
		"/stop",
		authenticate,
		// authorize,
		controller.apiRespond(controller.stopBuild.bind(controller))
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.create.bind(controller))
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.update.bind(controller))
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.delete.bind(controller))
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.apiRespond(controller.empty.bind(controller))
	);

export default router;
