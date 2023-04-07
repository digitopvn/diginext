import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import RouteController from "@/controllers/RouteController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new RouteController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	// create new domain
	.get("/", processApiRequest(controller.read));

export default router;
