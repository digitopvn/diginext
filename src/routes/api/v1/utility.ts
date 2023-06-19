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
	.post("/export-pdf", processApiRequest(controller.exportWebpagePDF.bind(controller)))
	.post("/capture-screenshot", processApiRequest(controller.captureScreenshot.bind(controller)));

export default router;
