import dayjs from "dayjs";
import { Get, Route, Security, Tags } from "tsoa/dist";

import { respondSuccess } from "@/interfaces";
import { currentVersion } from "@/plugins";

import BaseController from "./BaseController";

@Tags("Stats")
@Route("stats")
export default class StatsController extends BaseController {
	/**
	 * Current version
	 */
	@Get("/version")
	version() {
		return respondSuccess({ data: { version: currentVersion() } });
	}

	/**
	 * General stats
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/summary")
	async summary() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const [
			// all
			projects,
			apps,
			clusters,
			databases,
			db_backups,
			gits,
			registries,
			frameworks,
			users,
			builds,
			releases,
			// today
			today_projects,
			today_apps,
			today_clusters,
			today_databases,
			today_db_backups,
			today_gits,
			today_registries,
			today_frameworks,
			today_users,
			today_builds,
			today_releases,
			// week
			week_projects,
			week_apps,
			week_clusters,
			week_databases,
			week_db_backups,
			week_gits,
			week_registries,
			week_frameworks,
			week_users,
			week_builds,
			week_releases,
			// month
			month_projects,
			month_apps,
			month_clusters,
			month_databases,
			month_db_backups,
			month_gits,
			month_registries,
			month_frameworks,
			month_users,
			month_builds,
			month_releases,
		] = await Promise.all([
			// all
			DB.count("project", filter),
			DB.count("app", filter),
			DB.count("cluster", filter),
			DB.count("database", filter),
			DB.count("db_backup", filter),
			DB.count("git", filter),
			DB.count("registry", filter),
			DB.count("framework", filter),
			DB.count("user", { workspaces: this.workspace._id }),
			DB.count("build", filter),
			DB.count("release", filter),
			// today
			DB.count("project", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("app", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("cluster", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("database", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("db_backup", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("git", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("registry", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("framework", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("user", { workspaces: this.workspace._id, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("build", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			DB.count("release", { ...filter, createdAt: { $gte: dayjs().startOf("date").toDate() } }),
			// week
			DB.count("project", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("app", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("cluster", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("database", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("db_backup", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("git", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("registry", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("framework", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("user", { workspaces: this.workspace._id, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("build", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			DB.count("release", { ...filter, createdAt: { $gte: dayjs().startOf("week").toDate() } }),
			// month
			DB.count("project", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("app", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("cluster", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("database", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("db_backup", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("git", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("registry", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("framework", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("user", { workspaces: this.workspace._id, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("build", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
			DB.count("release", { ...filter, createdAt: { $gte: dayjs().startOf("month").toDate() } }),
		]);

		return respondSuccess({
			data: {
				all: { projects, apps, clusters, databases, db_backups, gits, registries, frameworks, users, builds, releases },
				today: {
					projects: today_projects,
					apps: today_apps,
					clusters: today_clusters,
					databases: today_databases,
					db_backups: today_db_backups,
					gits: today_gits,
					registries: today_registries,
					frameworks: today_frameworks,
					users: today_users,
					builds: today_builds,
					releases: today_releases,
				},
				week: {
					projects: week_projects,
					apps: week_apps,
					clusters: week_clusters,
					databases: week_databases,
					db_backups: week_db_backups,
					gits: week_gits,
					registries: week_registries,
					frameworks: week_frameworks,
					users: week_users,
					builds: week_builds,
					releases: week_releases,
				},
				month: {
					projects: month_projects,
					apps: month_apps,
					clusters: month_clusters,
					databases: month_databases,
					db_backups: month_db_backups,
					gits: month_gits,
					registries: month_registries,
					frameworks: month_frameworks,
					users: month_users,
					builds: month_builds,
					releases: month_releases,
				},
			},
		});
	}

	/**
	 * Count projects
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/projects")
	async projects() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const projects = await DB.count("project", filter);
		return respondSuccess({ data: { total: projects } });
	}

	/**
	 * Count apps
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/apps")
	async apps() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const apps = await DB.count("app", filter);
		return respondSuccess({ data: { total: apps } });
	}

	/**
	 * Count clusters
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/clusters")
	async clusters() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const clusters = await DB.count("cluster", filter);
		return respondSuccess({ data: { total: clusters } });
	}

	/**
	 * Count databases
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/databases")
	async databases() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const databases = await DB.count("database", filter);
		return respondSuccess({ data: { total: databases } });
	}

	/**
	 * Count git providers
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/gits")
	async gits() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const gits = await DB.count("git", filter);
		return respondSuccess({ data: { total: gits } });
	}

	/**
	 * Count registries
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/registries")
	async registries() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const registries = await DB.count("registry", filter);
		return respondSuccess({ data: { total: registries } });
	}

	/**
	 * Count frameworks
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/frameworks")
	async frameworks() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const frameworks = await DB.count("framework", filter);
		return respondSuccess({ data: { total: frameworks } });
	}

	/**
	 * Count users
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/users")
	async users() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspaces: this.workspace._id };
		const users = await DB.count("user", filter);
		return respondSuccess({ data: { total: users } });
	}

	/**
	 * Count builds
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/builds")
	async builds() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const builds = await DB.count("build", filter);
		return respondSuccess({ data: { total: builds } });
	}

	/**
	 * Count releases
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/releases")
	async releases() {
		const { DB } = await import("@/modules/api/DB");
		const filter = { workspace: this.workspace._id };
		const releases = await DB.count("release", filter);
		return respondSuccess({ data: { total: releases } });
	}
}
