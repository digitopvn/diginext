import express from "express";

import ReleaseController from "@/controllers/ReleaseController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = express.Router();

const controller = new ReleaseController();

/**
 * Roll out release schema
 * @typedef {object} ReleaseRollout
 * @property {string} id.required - The release's unique ID
 */

router
	.use(authenticate, authorize)
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read.bind(controller)))
	.post("/", controller.apiRespond(controller.create.bind(controller)))
	.post("/from-build", controller.apiRespond(controller.createFromBuild.bind(controller)))
	.patch("/", controller.apiRespond(controller.update.bind(controller)))
	.delete("/", controller.apiRespond(controller.delete.bind(controller)))
	.delete("/empty", controller.apiRespond(controller.empty.bind(controller)))
	.patch("/rollout", controller.apiRespond(controller.rollout.bind(controller)))
	.patch("/preview", controller.apiRespond(controller.previewPrerelease.bind(controller)));
// Turn this migration off
// .get("/migrate", authenticate, controller.migrate.bind(controller));

export default router;
