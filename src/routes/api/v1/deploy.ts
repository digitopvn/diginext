import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import DeployController from "@/controllers/DeployController";
import { authenticate } from "@/middlewares/authenticate";

dayjs.extend(localizedFormat);

const controller = new DeployController();
const router = express.Router();

router
	/**
	 * Deploy from a source code (git repository)
	 */
	.post(
		"/",
		authenticate,
		// authorization,
		controller.apiRespond(controller.deployFromSource.bind(controller)).bind(controller)
	)
	/**
	 * Deploy from an image URL
	 */
	.post(
		"/from-image",
		authenticate,
		// authorization,
		controller.apiRespond(controller.deployFromImage.bind(controller)).bind(controller)
	);

export default router;
