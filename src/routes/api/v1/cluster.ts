import express from "express";

import ClusterController from "@/controllers/ClusterController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new ClusterController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get(
		"/",
		authenticate,
		// authorize,
		controller.read.bind(controller)
	)
	.get(
		"/connect",
		authenticate,
		// authorize,
		controller.connect.bind(controller)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.create.bind(controller)
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.update.bind(controller)
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.softDelete.bind(controller)
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.empty.bind(controller)
	);

export default router;
