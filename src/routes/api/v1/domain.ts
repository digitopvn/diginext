import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import DomainController from "@/controllers/DomainController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new DomainController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	// create new domain
	.post("/", processApiRequest(controller.createDiginextDomain.bind(controller)))
	.get("/", processApiRequest(controller.getDiginextDomains.bind(controller)))
	.get("/records", processApiRequest(controller.getDiginextDomainRecords.bind(controller)))
	.get("/records/:recordName", processApiRequest(controller.getDiginextDomainRecordByName.bind(controller)))
	.patch("/records/:recordName", processApiRequest(controller.updateDiginextDomainRecord.bind(controller)))
	.delete("/records/:recordName", processApiRequest(controller.deleteDiginextDomainRecord.bind(controller)));

export default router;
