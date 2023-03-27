import express from "express";

import UserController from "@/controllers/UserController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new UserController();

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
	.post(
		"/",
		// temporary disable auth
		// authenticate,
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
	)
	.patch(
		"/join-workspace",
		authenticate,
		// authorize,
		controller.apiRespond(controller.joinWorkspace.bind(controller))
	);

export default router;
