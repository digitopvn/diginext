import express from "express";

import appRouter from "./app";
import buildRouter from "./build";
import clusterRouter from "./cluster";
import databaseRouter from "./database";
import frameworkRouter from "./framework";
import gitRouter from "./git-provider";
import projectRouter from "./project";
import providerRouter from "./provider";
import registryRouter from "./registry";
import releaseRouter from "./release";
import roleRouter from "./role";
import teamRouter from "./team";
import userRouter from "./user";
import workspaceRouter from "./workspace";

const router = express.Router();

/**
 * Default route
 */
// router.get("/", (req, res) => Response.ignore(res, `What do you want?`));

/**
 * Register API routes
 */
router.get("/healthz", (req, res) => res.status(200).json({ status: 1 }));
router.use("/user", userRouter);
router.use("/team", teamRouter);
router.use("/role", roleRouter);
router.use("/workspace", workspaceRouter);
router.use("/project", projectRouter);
router.use("/app", appRouter);
router.use("/release", releaseRouter);
router.use("/build", buildRouter);
router.use("/provider", providerRouter);
router.use("/cluster", clusterRouter);
router.use("/git", gitRouter);
router.use("/framework", frameworkRouter);
router.use("/database", databaseRouter);
router.use("/registry", registryRouter);

export default router;
