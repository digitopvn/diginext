import express from "express";

import apiKeyUserRouter from "./api_key";
import appRouter from "./app";
import buildRouter from "./build";
import clusterRouter from "./cluster";
import databaseRouter from "./database";
import deployRouter from "./deploy";
import domainRouter from "./domain";
import frameworkRouter from "./framework";
import gitRouter from "./git";
import projectRouter from "./project";
import providerRouter from "./provider";
import registryRouter from "./registry";
import releaseRouter from "./release";
import roleRouter from "./role";
import routeRouter from "./route";
import serviceAccountRouter from "./service_account";
import teamRouter from "./team";
import userRouter from "./user";
import workspaceRouter from "./workspace";

const router = express.Router();

/**
 * Register API routes
 */
router.get("/healthz", (req, res) => res.status(200).json({ status: 1 }));
router.use("/user", userRouter);
router.use("/service_account", serviceAccountRouter);
router.use("/api_key", apiKeyUserRouter);
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
router.use("/deploy", deployRouter);
router.use("/domain", domainRouter);
router.use("/route", routeRouter);

export default router;
