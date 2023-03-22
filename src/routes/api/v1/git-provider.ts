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
	.get(
		"/ssh/public-key",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getPublicKey.bind(controller))
	)
	.post(
		"/ssh/create",
		authenticate,
		// authorize,
		controller.apiRespond(controller.createKeysSSH.bind(controller))
	)
	.post(
		"/ssh/generate",
		authenticate,
		// authorize,
		controller.apiRespond(controller.generateSSH.bind(controller))
	)
	.post(
		"/ssh/verify",
		authenticate,
		// authorize,
		controller.apiRespond(controller.verifySSH.bind(controller))
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.apiRespond(controller.empty.bind(controller))
	);

export default router;
