import express from "express";

import TeamController from "@/controllers/TeamController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new TeamController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", authenticate, controller.read.bind(controller))
	.post(
		"/",
		// temporary disable auth
		// authenticate,
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
