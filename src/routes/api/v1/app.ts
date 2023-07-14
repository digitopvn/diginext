import express from "express";

import AppController from "@/controllers/AppController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new AppController();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.get("/config", processApiRequest(controller.getAppConfig.bind(controller)))
	.post("/ssh-url", processApiRequest(controller.createFromSshURL.bind(controller)))
	.post("/import-git", processApiRequest(controller.importFromGitSshURL.bind(controller)))
	.delete("/archive", processApiRequest(controller.archiveApp.bind(controller)))
	.post("/unarchive", processApiRequest(controller.unarchiveApp.bind(controller)))
	// .delete("/empty", processApiRequest(controller.empty.bind(controller)))
	// environment
	.get("/environment", processApiRequest(controller.getDeployEnvironment.bind(controller)))
	.post("/environment", processApiRequest(controller.createDeployEnvironment.bind(controller)))
	.patch("/environment", processApiRequest(controller.updateDeployEnvironment.bind(controller)))
	.delete("/environment", processApiRequest(controller.deleteDeployEnvironment.bind(controller)))
	// deploy_environment
	.get("/deploy_environment", processApiRequest(controller.getDeployEnvironmentV2.bind(controller)))
	.post("/deploy_environment", processApiRequest(controller.createDeployEnvironmentV2.bind(controller)))
	.patch("/deploy_environment", processApiRequest(controller.updateDeployEnvironmentV2.bind(controller)))
	.delete("/deploy_environment", processApiRequest(controller.deleteDeployEnvironmentV2.bind(controller)))
	// logs
	.get("/environment/logs", processApiRequest(controller.viewLogs.bind(controller)))
	// domains
	.post("/environment/domains", processApiRequest(controller.addEnvironmentDomain.bind(controller)))
	// environment variables
	.get("/environment/variables", processApiRequest(controller.getEnvVarsOnDeployEnvironment.bind(controller)))
	.post("/environment/variables", processApiRequest(controller.createEnvVarsOnDeployEnvironment.bind(controller)))
	.patch("/environment/variables", processApiRequest(controller.updateSingleEnvVarOnDeployEnvironment.bind(controller)))
	.delete("/environment/variables", processApiRequest(controller.deleteEnvVarsOnDeployEnvironment.bind(controller)));

export default router;
