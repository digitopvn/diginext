import express from "express";

import { isServerReady } from "@/server";

import apiKeyUserRouter from "./api_key";
import appRouter from "./app";
import askAiRouter from "./ask-ai";
import buildRouter from "./build";
import clusterRouter from "./cluster";
import cronjobRouter from "./cronjob";
import databaseRouter from "./database";
import databaseBackupRouter from "./database-backup";
import deployRouter from "./deploy";
import deployEnvironmentRouter from "./deploy-environment";
import domainRouter from "./domain";
import frameworkRouter from "./framework";
import gitRouter from "./git";
import mediaRouter from "./media";
import monitorRouter from "./monitor";
import notificationRouter from "./notification";
import projectRouter from "./project";
import providerRouter from "./provider";
import registryRouter from "./registry";
import releaseRouter from "./release";
import roleRouter from "./role";
import routeRouter from "./route";
import serviceAccountRouter from "./service_account";
import statsRouter from "./stats";
import storageRouter from "./storage";
import teamRouter from "./team";
import userRouter from "./user";
import utilityRouter from "./utility";
import webhookRouter from "./webhook";
import workspaceRouter from "./workspace";

const router = express.Router();

/**
 * Healh check
 */
router.get("/healthz", (req, res) => res.status(200).json({ status: 1, data: { ready: isServerReady } }));

/**
 * Register API routes
 */
router.use("/user", userRouter);
router.use("/service_account", serviceAccountRouter);
router.use("/api_key", apiKeyUserRouter);
router.use("/provider", providerRouter);
router.use("/team", teamRouter);
router.use("/role", roleRouter);
router.use("/workspace", workspaceRouter);
router.use("/project", projectRouter);
router.use("/app", appRouter);
router.use("/deploy", deployRouter);
router.use("/deploy-environment", deployEnvironmentRouter);
router.use("/release", releaseRouter);
router.use("/build", buildRouter);
router.use("/cluster", clusterRouter);
router.use("/git", gitRouter);
router.use("/framework", frameworkRouter);
router.use("/database", databaseRouter);
router.use("/database-backup", databaseBackupRouter);
router.use("/storage", storageRouter);
router.use("/registry", registryRouter);
router.use("/domain", domainRouter);
router.use("/route", routeRouter);
router.use("/utility", utilityRouter);
router.use("/monitor", monitorRouter);
router.use("/cronjob", cronjobRouter);
router.use("/stats", statsRouter);
router.use("/webhook", webhookRouter);
router.use("/notification", notificationRouter);
router.use("/media", mediaRouter);
router.use("/ask-ai", askAiRouter);

export default router;
