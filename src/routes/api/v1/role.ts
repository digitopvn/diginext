import express from "express";

import RoleController from "@/controllers/RoleController";

const router = express.Router();

const controller = new RoleController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	/**
	 * GET /api/v1/role
	 * @tags role
	 * @summary Get list of roles
	 * @param {integer} page.query - Current page - 1
	 * @param {integer} size.query - Number of items per page - 50
	 * @param {integer} skip.query - Number of skipped items
	 * @param {integer} limit.query - Number of items per page
	 * @return {ApiResponse} 200 - success response
	 */
	.get("/", controller.read.bind(controller))
	/**
	 * POST /api/v1/role
	 * @tags role
	 * @summary Create new role
	 * @param {Role} request.body.required
	 * @return {ApiResponse} 200 - success response
	 */
	.post("/", controller.create.bind(controller))
	/**
	 * PATCH /api/v1/role
	 * @tags role
	 * @summary Update an role
	 * @param {Role} request.body
	 * @return {ApiResponse} 200 - success response
	 */
	.patch("/", controller.update.bind(controller))
	/**
	 * DELETE /api/v1/role
	 * @tags role
	 * @summary Delete an role
	 * @param {string} id.query.required - Role ID
	 * @return {ApiResponse} 200 - success response
	 */
	.delete("/", controller.softDelete.bind(controller))
	/**
	 * DELETE /api/v1/role
	 * @tags role
	 * @summary [DANGER] Empty the whole collection
	 * @param {string} pass.query.required - Password for emptying the collection (nguyhiemvcl)
	 * @return {ApiResponse} 200 - success response
	 */
	.delete("/empty", controller.empty.bind(controller));

export default router;
