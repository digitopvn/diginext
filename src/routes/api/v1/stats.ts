import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import StatsController from "@/controllers/StatsController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new StatsController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	// version, export pdf, capture screenshot,...
	.get("/version", processApiRequest(controller.version.bind(controller)))
	.get("/summary", processApiRequest(controller.summary.bind(controller)))
	.get("/projects", processApiRequest(controller.projects.bind(controller)))
	.get("/apps", processApiRequest(controller.apps.bind(controller)))
	// .get("/deploy-environments", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/clusters", processApiRequest(controller.clusters.bind(controller)))
	.get("/databases", processApiRequest(controller.databases.bind(controller)))
	.get("/gits", processApiRequest(controller.gits.bind(controller)))
	.get("/registries", processApiRequest(controller.registries.bind(controller)))
	.get("/frameworks", processApiRequest(controller.frameworks.bind(controller)))
	.get("/users", processApiRequest(controller.users.bind(controller)))
	.get("/builds", processApiRequest(controller.builds.bind(controller)))
	.get("/releases", processApiRequest(controller.releases.bind(controller)));

export default router;
