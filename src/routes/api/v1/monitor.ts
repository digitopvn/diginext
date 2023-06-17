import express from "express";

import MonitorController from "@/controllers/MonitorController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const controller = new MonitorController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	// namespaces, services, deployments,...
	.get("/nodes", processApiRequest(controller.getNodes.bind(controller)))
	.get("/namespaces", processApiRequest(controller.getNamespaces.bind(controller)))
	.get("/services", processApiRequest(controller.getServices.bind(controller)))
	.get("/ingresses", processApiRequest(controller.getIngresses.bind(controller)))
	.get("/deployments", processApiRequest(controller.getDeploys.bind(controller)))
	.get("/pods", processApiRequest(controller.getPods.bind(controller)))
	.get("/secrets", processApiRequest(controller.getSecrets.bind(controller)));

export default router;
