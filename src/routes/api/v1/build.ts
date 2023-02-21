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
		controller.apiRespond(controller.read)
	)
	.get(
		"/logs",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getLogs)
	)
	.patch(
		"/stop",
		authenticate,
		// authorize,
		controller.apiRespond(controller.stopBuild)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.create)
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.update)
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.delete)
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.apiRespond(controller.empty)
	);

export default router;
