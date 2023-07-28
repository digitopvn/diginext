import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import AskAiController from "@/controllers/AskAiController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new AskAiController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	/**
	 * Ask AI: generate a Dockerfile
	 */
	.post("/generate/dockerfile", processApiRequest(controller.generateDockerfile.bind(controller)));

export default router;
