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
	// nodes
	.get("/nodes", processApiRequest(controller.getNodes.bind(controller)))
	// namespaces
	.get("/namespaces", processApiRequest(controller.getNamespaces.bind(controller)))
	.delete("/namespaces", processApiRequest(controller.deleteNamespace.bind(controller)))
	// services
	.get("/services", processApiRequest(controller.getServices.bind(controller)))
	.delete("/services", processApiRequest(controller.deleteService.bind(controller)))
	// ingresses
	.get("/ingresses", processApiRequest(controller.getIngresses.bind(controller)))
	.delete("/ingresses", processApiRequest(controller.deleteIngresses.bind(controller)))
	// deployments
	.get("/deployments", processApiRequest(controller.getDeploys.bind(controller)))
	.delete("/deployments", processApiRequest(controller.deleteDeploys.bind(controller)))
	// pods
	.get("/pods", processApiRequest(controller.getPods.bind(controller)))
	.delete("/pods", processApiRequest(controller.deletePods.bind(controller)))
	// secrets
	.get("/secrets", processApiRequest(controller.getSecrets.bind(controller)))
	.delete("/secrets", processApiRequest(controller.deleteSecrets.bind(controller)));

export default router;
