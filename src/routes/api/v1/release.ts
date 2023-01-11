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
		controller.read.bind(controller)
	)
	.post(
		"/",
		authenticate,
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
	)
	.patch(
		"/rollout",
		authenticate,
		// authorize,
		controller.rollout.bind(controller)
	)
	.patch(
		"/preview",
		authenticate,
		// authorize,
		controller.previewPrerelease.bind(controller)
	)
	// Create new {Release} from {Build} data
	.post(
		"/from-build",
		authenticate,
		// authorize,
		controller.createFromBuild.bind(controller)
	);
// Turn this migration off
// .get("/migrate", authenticate, controller.migrate.bind(controller));

export default router;
