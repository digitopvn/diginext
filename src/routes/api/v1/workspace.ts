import express from "express";

import WorkspaceController from "@/controllers/WorkspaceController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new WorkspaceController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read.bind(controller)))
	.post(
		"/",
		// temporary disable auth
		// authenticate, authorize,
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
		"/add-user",
		authenticate,
		// authorize,
		controller.apiRespond(controller.addUser.bind(controller))
	);

export default router;
