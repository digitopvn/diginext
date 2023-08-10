import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import express from "express";

import { Config } from "../app.config";

dayjs.extend(timezone);

import apiV1 from "@/routes/api/v1";

import googleAuth from "./auth/google";
import authLogout from "./auth/logout";
import authProfileApi from "./auth/profile";
import refreshTokenApi from "./auth/refresh";

const router = express.Router();

/**
 * Register routes
 */
router.use(Config.getBasePath(`/auth/profile`), authProfileApi);
router.use(Config.getBasePath(`/auth/google`), googleAuth);
router.use(Config.getBasePath(`/auth/logout`), authLogout);
router.use(Config.getBasePath(`/auth/refresh`), refreshTokenApi);

if (apiV1) router.use(Config.getBasePath(`/api/v1`), apiV1);

export default router;
