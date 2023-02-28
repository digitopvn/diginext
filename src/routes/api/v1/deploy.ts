import { isJSON } from "class-validator";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { log } from "diginext-utils/dist/console/log";
import express from "express";

import DeployController from "@/controllers/DeployController";
import { authenticate } from "@/middlewares/authenticate";

dayjs.extend(localizedFormat);

const controller = new DeployController();
const router = express.Router();

router
	/**
	 * Deploy from source code (git repository)
	 */
	.post("/", authenticate, async (req, res) => {
		const { options } = req.body;

		// validation...
		if (!options) return res.status(200).json({ status: 0, messages: [`Deploy "options" is required.`] });
		if (!isJSON(options)) return res.status(200).json({ status: 0, messages: [`Deploy "options" is invalid (should be in JSON format).`] });

		// convert JSON to Object
		req.body.options = JSON.parse(options);

		// no need to wait :)
		controller.deployFromSource(req.body).then((result) => log(`Finished deploying from source code:`, { result }));

		res.status(200).json({ status: 1 });
	})
	/**
	 * Deploy from image URL
	 */
	.post("/from-image", authenticate, async (req, res) => {
		const result = await controller.deployFromImage(req.body);
		res.status(200).json(result);
	});

export default router;
