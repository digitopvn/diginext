import "reflect-metadata";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { log, logSuccess } from "diginext-utils/dist/console/log";
import type { Request, Response } from "express";
import express from "express";
import { queryParser } from "express-query-parser";
import session from "express-session";
import * as fs from "fs";
import type { Server } from "http";
import { createServer } from "http";
import { isEmpty } from "lodash";
import morgan from "morgan";
import cronjob from "node-cron";
import passport from "passport";
import path from "path";
import { Server as SocketServer } from "socket.io";
import swaggerUi from "swagger-ui-express";

// routes
import { googleStrategy } from "@/modules/passports/googleStrategy";
import { jwtStrategy } from "@/modules/passports/jwtStrategy";

import { Config, IsDev, IsProd } from "./app.config";
import { cleanUp } from "./build/system";
import { CLI_CONFIG_DIR } from "./config/const";
import { failSafeHandler } from "./middlewares/failSafeHandler";
/**
 * CUSTOM MIDDLEWARES
 */
import { route404_handler } from "./middlewares/route404";
import { migrateAllFrameworks } from "./migration/migrate-all-frameworks";
import { migrateAllGitProviders } from "./migration/migrate-all-git-providers";
import { migrateAllReleases } from "./migration/migrate-all-releases";
import { migrateAllAppEnvironment } from "./migration/migrate-app-environment";
// import listEndpoints from "express-list-endpoints";
// database
import AppDatabase from "./modules/AppDatabase";
import { verifySSH } from "./modules/git";
import ClusterManager from "./modules/k8s";
import { providerAuthenticate } from "./modules/providers";
import { connectRegistry } from "./modules/registry/connect-registry";
import main from "./routes/main";
import { CloudProviderService, ClusterService, ContainerRegistryService, GitProviderService } from "./services";
/**
 * ENVIRONMENT CONFIG
 */
const { BASE_PATH, PORT, CLI_MODE } = Config;

/**
 * EXPRESS JS INITIALIZING
 */
let app;
let server: Server;
let socketIO: SocketServer;

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

	// connect git providers
	const gitSvc = new GitProviderService();
	const gitProviders = await gitSvc.find({});
	if (!isEmpty(gitProviders)) {
		for (const gitProvider of gitProviders) {
			verifySSH({ gitProvider: gitProvider.type });
		}
	}

	// connect cloud providers
	const providerSvc = new CloudProviderService();
	const providers = await providerSvc.find({});
	if (providers.length > 0) {
		for (const provider of providers) {
			providerAuthenticate(provider);
		}
	}

	// connect container registries
	const registrySvc = new ContainerRegistryService();
	const registries = await registrySvc.find({});
	if (registries.length > 0) {
		for (const registry of registries) {
			connectRegistry(registry);
		}
	}

	// connect clusters
	const clusterSvc = new ClusterService();
	const clusters = await clusterSvc.find({});
	if (clusters.length > 0) {
		for (const cluster of clusters) {
			await ClusterManager.authCluster(cluster.shortName, { shouldSwitchContextToThisCluster: false });
		}
	}

	// cronjobs
	logSuccess(`[SYSTEM] ✓ Cronjob of "System Clean Up" has been scheduled every 3 days at 00:00 AM`);
	cronjob.schedule("0 0 */3 * *", () => {
		/**
		 * Schedule a clean up task every 3 days at 00:00 AM
		 */
		cleanUp();
	});

	// migration
	await migrateAllAppEnvironment();
	await migrateAllReleases();
	await migrateAllFrameworks();
	await migrateAllGitProviders();
}

function initialize() {
	/**
	 * ! ONLY START THE BUILD SERVER UP IF RUNNING CLI AS "SERVER" MODE
	 */
	if (CLI_MODE === "server") {
		log(`Server is initializing...`);

		app = express();
		server = createServer(app);

		/**
		 * Websocket / SOCKET.IO
		 */
		socketIO = new SocketServer(server, { transports: ["websocket"] });
		socketIO.on("connection", (socket) => {
			console.log("a user connected");

			socket.on("join", (data) => {
				console.log("join room:", data);
				socket.join(data.room);
			});
		});

		/**
		 * CORS MIDDLEWARE
		 * Access-Control-Allow-Headers
		 */
		app.use((req, res, next) => {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Methods", "GET, PATCH, POST, DELETE");
			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
			res.header("X-Powered-By", "TOP GROUP");
			next();
		});

		/**
		 * SERVING STATIC FILES
		 */
		app.use(express.static(path.resolve(process.cwd(), "public")));

		/**
		 * TODO: Enable SWAGGER for API Docs
		 * SWAGGER API DOCS
		 */
		app.use(
			"/api-docs",
			swaggerUi.serve,
			swaggerUi.setup(undefined, {
				swaggerOptions: {
					url: "/swagger.json",
				},
			})
		);

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
		morgan.token("user", (req: Request) => (req.user ? `[${(req.user as any)?.slug}]` : "[unauthenticated]"));
		const morganMessage = IsDev()
			? "[REQUEST :date[clf]] :method - :user - :url :status :response-time ms - :res[content-length]"
			: `[REQUEST :date[clf]] :method - :user - ":url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"`;
		const morganOptions = {
			skip: (req, res) => req.method.toUpperCase() === "OPTIONS",
		} as morgan.Options<Request, Response>;
		app.use(morgan(morganMessage, morganOptions));

		// Mở lộ ra path cho HEALTHCHECK & APIs (nếu có)
		app.use(`/${BASE_PATH}`, main);

		/**
		 * ROUTE 404 & FAIL SAFE HANDLING MIDDLEWARE
		 */
		app.use("*", route404_handler);

		if (IsProd()) app.use(failSafeHandler);

		/**
		 * SERVER HANDLING
		 */
		function onConnect() {
			logSuccess(`Server is UP & listening at port ${PORT}...`);
		}

		server.on("error", (e: any) => log(`ERROR:`, e));
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

AppDatabase.connect(initialize);

export const getIO = () => socketIO;

export { app, server, socketIO };
