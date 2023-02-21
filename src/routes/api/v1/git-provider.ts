import express from "express";

import GitProviderController from "@/controllers/GitProviderController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new GitProviderController();

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
		"/ssh",
		authenticate,
		// authorize,
		controller.apiRespond(controller.generateSSH.bind(controller))
	)
	.get(
		"/ssh-verify",
		authenticate,
		// authorize,
		controller.apiRespond(controller.verifySSH.bind(controller))
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
