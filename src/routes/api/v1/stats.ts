import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import UtilityController from "@/controllers/UtilityController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new UtilityController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	// export pdf, capture screenshot,...
	.get("/summary", processApiRequest(controller.exportWebpagePDF.bind(controller)))
	.get("/projects", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/apps", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/deploy-environments", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/clusters", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/databases", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/gits", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/registries", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/frameworks", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/users", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/builds", processApiRequest(controller.captureScreenshot.bind(controller)))
	.get("/releases", processApiRequest(controller.captureScreenshot.bind(controller)));

export default router;
