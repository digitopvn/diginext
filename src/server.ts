import "reflect-metadata";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { log, logError, logSuccess } from "diginext-utils/dist/console/log";
import express from "express";
import { queryParser } from "express-query-parser";
import session from "express-session";
import * as fs from "fs";
import type { Server } from "http";
import { createServer } from "http";
import passport from "passport";
import path from "path";
import { Server as SocketServer } from "socket.io";

// routes
import { googleStrategy } from "@/modules/passports/googleStrategy";
import { jwtStrategy } from "@/modules/passports/jwtStrategy";

import { Config } from "./app.config";
import { CLI_CONFIG_DIR } from "./config/const";
/**
 * CUSTOM MIDDLEWARES
 */
import logEnabled from "./middlewares/logEnabled";
import { route404_handler } from "./middlewares/route404";
// import listEndpoints from "express-list-endpoints";
// database
import AppDatabase from "./modules/AppDatabase";
import ClusterManager from "./modules/k8s";
import { providerAuthenticate } from "./modules/providers";
import { connect } from "./modules/registry";
import { logInfo } from "./plugins";
import main from "./routes/main";
import { CloudProviderService, ClusterService, ContainerRegistryService } from "./services";

/**
 * ENVIRONMENT CONFIG
 */
const { BASE_PATH, PORT, CLI_MODE } = Config;

/**
 * EXPRESS JS INITIALIZING
 */
let app;
let server: Server;
let io: SocketServer;

if (process.env.CLI_MODE == "server") log(`Connecting to database. Please wait...`);

/**
 * BUILD SERVER INITIAL START-UP SCRIPTS:
 * - Create config directory in {HOME_DIR}
 * - Connect GIT providers (if any)
 * - Connect container registries (if any)
 * - Connect K8S clusters (if any)
 */
async function startupScripts() {
	log(`-------------- RUNNING INITIAL SCRIPTS -----------------`);

	// config dir
	if (!fs.existsSync(CLI_CONFIG_DIR)) fs.mkdirSync(CLI_CONFIG_DIR);

	// connect cloud providers
	const providerSvc = new CloudProviderService();
	const providers = await providerSvc.find({});
	if (providers.length > 0) {
		providers.forEach(async (provider) => {
			await providerAuthenticate(provider);
		});
	}

	// connect container registries
	const registrySvc = new ContainerRegistryService();
	const registries = await registrySvc.find({});
	if (registries.length > 0) {
		registries.forEach(async (registry) => {
			await connect(registry);
		});
	}

	// connect clusters
	const clusterSvc = new ClusterService();
	const clusters = await clusterSvc.find({});
	if (clusters.length > 0) {
		clusters.forEach(async (cluster) => {
			// only switch current context to cluster if provider is "custom"?
			await ClusterManager.auth(cluster.shortName, { shouldSwitchContextToThisCluster: cluster.providerShortName === "custom" }).catch((e) =>
				logError(e)
			);
		});
	}
}

function initialize() {
	/**
	 * ! ONLY START THE BUILD SERVER UP IF RUNNING CLI AS "SERVER" MODE
	 */
	if (CLI_MODE == "server") {
		log(`Server is initializing...`);

		app = express();
		server = createServer(app);

		/**
		 * Websocket / SOCKET.IO
		 */
		io = new SocketServer(server, { transports: ["websocket"] });
		io.on("connection", (socket) => {
			console.log("a user connected");

			socket.on("join", (data) => {
				console.log("join room:", data);
				socket.join(data.room);
			});
		});

		/**
		 * TODO: Enable SWAGGER for API Docs
		 */

		/**
		 * CORS MIDDLEWARE
		 */
		app.use((req, res, next) => {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Methods", "GET, PATCH, POST, DELETE");
			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
			res.header("X-Powered-By", "TOP GROUP");
			next();
		});

		/**
		 * SERVING STATIC FILES
		 */
		app.use(express.static(path.resolve(process.cwd(), "public")));

		/**
		 * PASSPORT STRATEGY
		 */
		passport.use(googleStrategy);
		passport.use(jwtStrategy);
		passport.serializeUser((user, done) => done(null, user));
		passport.deserializeUser((obj, done) => done(null, obj));

		/**
		 * BODY PARSER
		 */
		app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
		app.use(bodyParser.json({ limit: "200mb" }));

		/**
		 * QUERY PARSER
		 */
		app.use(
			queryParser({
				parseNull: true,
				parseUndefined: true,
				parseBoolean: true,
				parseNumber: true,
			})
		);

		/**
		 * COOKIES & SESSION PARSER
		 */
		app.use(cookieParser());
		app.use(
			session({
				name: Config.grab(`SESSION_NAME`, `diginext-cli`),
				secret: Config.grab(`JWT_SECRET`, "123"),
				proxy: true,
				resave: true,
				saveUninitialized: true,
				cookie: {
					maxAge: 1000 * 60 * 100,
				},
			})
		);

		/**
		 * AUTHENTICATION MIDDLEWARE
		 */
		app.use(passport.initialize());
		app.use(passport.session());

		/**
		 * LOGGING SYSTEM MIDDLEWARE - ENABLED
		 * Enable when running on server
		 */
		app.use(logEnabled(Config.ENV !== "development"));

		// Mở lộ ra path cho HEALTHCHECK & APIs (nếu có)
		app.use(`/${BASE_PATH}`, main);

		/**
		 * ROUTE 404 MIDDLEWARE
		 */
		// app.use(route404);
		app.use("*", route404_handler);

		/**
		 * SERVER HANDLING
		 */
		function onConnect() {
			logSuccess(`Server is UP & listening at port ${PORT}...`);
		}

		server.on("error", (e: any) => logInfo(`ERROR:`, e));
		server.listen(PORT, onConnect);

		/**
		 * BUILD SERVER INITIAL START-UP SCRIPTS:
		 * - Connect GIT providers (if any)
		 * - Connect container registries (if any)
		 * - Connect K8S clusters (if any)
		 */
		startupScripts();
	}
}

// export const db = new AppDatabase();
AppDatabase.connect(initialize);

export const getIO = () => io;

export { app, io, server };
