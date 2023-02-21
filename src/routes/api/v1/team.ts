import express from "express";

import TeamController from "@/controllers/TeamController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new TeamController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", authenticate, controller.apiRespond(controller.read))
	.post(
		"/",
		// temporary disable auth
		// authenticate,
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
