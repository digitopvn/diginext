import express from "express";

import WorkspaceController from "@/controllers/WorkspaceController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new WorkspaceController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	/**
	 * GET /api/v1/Workspace
	 * @tags Workspace
	 * @summary Get list of Workspaces
	 * @param {integer} page.query - Current page - 1
	 * @param {integer} size.query - Number of items per page - 50
	 * @param {integer} skip.query - Number of skipped items
	 * @param {integer} limit.query - Number of items per page
	 * @return {WorkspaceApiResponse} 200 - success response
	 */
	.get("/", controller.read.bind(controller))
	/**
	 * POST /api/v1/Workspace
	 * @tags Workspace
	 * @summary Create new Workspace
	 * @param {Workspace} request.body.required
	 * @return {WorkspaceApiResponse} 200 - success response
	 */
	.post(
		"/",
		// temporary disable auth
		// authenticate, authorize,
		controller.create.bind(controller)
	)
	/**
	 * PATCH /api/v1/Workspace
	 * @tags Workspace
	 * @summary Update an Workspace
	 * @param {Workspace} request.body
	 * @return {WorkspaceApiResponse} 200 - success response
	 */
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.update.bind(controller)
	)
	/**
	 * DELETE /api/v1/Workspace
	 * @tags Workspace
	 * @summary Delete an Workspace
	 * @param {string} id.query.required - Workspace ID
	 * @return {WorkspaceApiResponse} 200 - success response
	 */
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.softDelete.bind(controller)
	)
	/**
	 * DELETE /api/v1/Workspace
	 * @tags Workspace
	 * @summary [DANGER] Empty the whole collection
	 * @param {string} pass.query.required - Password for emptying the collection (nguyhiemvcl)
	 * @return {ApiResponse} 200 - success response
	 */
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.empty.bind(controller)
	);

export default router;
