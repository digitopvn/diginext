import express from "express";

import ReleaseController from "@/controllers/ReleaseController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new ReleaseController();

/**
 * Roll out release schema
 * @typedef {object} ReleaseRollout
 * @property {string} id.required - The release's unique ID
 */

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.post("/from-app", processApiRequest(controller.createFromApp.bind(controller)))
	.post("/from-build", processApiRequest(controller.createFromBuild.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.delete("/empty", processApiRequest(controller.empty.bind(controller)))
	.patch("/rollout", processApiRequest(controller.rollout.bind(controller)))
	.patch("/preview", processApiRequest(controller.previewPrerelease.bind(controller)));
// Turn this migration off
// .get("/migrate", authenticate, controller.migrate.bind(controller));

export default router;
