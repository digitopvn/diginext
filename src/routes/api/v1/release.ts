import express from "express";

import ReleaseController from "@/controllers/ReleaseController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new ReleaseController();

/**
 * Roll out release schema
 * @typedef {object} ReleaseRollout
 * @property {string} id.required - The release's unique ID
 */

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
	)
	.patch(
		"/rollout",
		authenticate,
		// authorize,
		controller.apiRespond(controller.rollout)
	)
	.patch(
		"/preview",
		authenticate,
		// authorize,
		controller.apiRespond(controller.previewPrerelease)
	)
	// Create new {Release} from {Build} data
	.post(
		"/from-build",
		authenticate,
		// authorize,
		controller.apiRespond(controller.createFromBuild)
	);
// Turn this migration off
// .get("/migrate", authenticate, controller.migrate.bind(controller));

export default router;
