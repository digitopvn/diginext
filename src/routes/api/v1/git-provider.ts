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
		controller.apiRespond(controller.read)
	)
	.get(
		"/ssh",
		authenticate,
		// authorize,
		controller.apiRespond(controller.generateSSH)
	)
	.get(
		"/ssh-verify",
		authenticate,
		// authorize,
		controller.apiRespond(controller.verifySSH)
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
