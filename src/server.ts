import "reflect-metadata";

import bodyParser from "body-parser";
import console from "console";
import cookieParser from "cookie-parser";
import session from "cookie-session";
import cors from "cors";
import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import type { Express, Request, Response } from "express";
import express from "express";
import { queryParser } from "express-query-parser";
import type { Server } from "http";
import { createServer } from "http";
import type mongoose from "mongoose";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import { RateLimiterMongo } from "rate-limiter-flexible";
import { Server as SocketServer } from "socket.io";
import swaggerUi from "swagger-ui-express";

import { googleStrategy } from "@/modules/passports/googleStrategy";
import { jwtStrategy } from "@/modules/passports/jwtStrategy";

import { Config, IsDev, IsProd, IsTest } from "./app.config";
import { CLI_DIR } from "./config/const";
import type { AppRequest } from "./interfaces/SystemTypes";
import { failSafeHandler } from "./middlewares/failSafeHandler";
import AppDatabase from "./modules/AppDatabase";
import { startupScripts } from "./modules/server/startup-scripts";
import basicAuthRouter from "./routes/api/v1/basic-auth";
import routes from "./routes/routes";
import { SystemLogService } from "./services/SystemLogService";
/**
 * ENVIRONMENT CONFIG
 */
const { BASE_PATH, PORT, CLI_MODE } = Config;

/**
 * CORS configuration
 */
const allowedHosts = [
	"localhost:3000",
	"localhost:6969",
	"localhost:4000",
	"localhost:42000",
	"topgroup.diginext.site",
	"topgroup-v2.diginext.site",
	"diginext.vn",
	"www.diginext.vn",
	"diginext.site",
	"www.diginext.site",
	"hobby.diginext.site",
	"app.diginext.site",
	"wearetopgroup.com",
	"digitop.vn",
];
const subdomainWhitelist = /^https?:\/\/(\w+-?\w+\.)*diginext\.site$/;
const allowedHeaders = [
	"Origin",
	"X-Requested-With",
	"x-api-key",
	"x-auth-cookie",
	"Content-Type",
	"Accept",
	"Authorization",
	"Cache-Control",
	"Cookie",
	"User-Agent",
];
const allowedMethods = ["OPTIONS", "GET", "PATCH", "POST", "DELETE"];

const corsOptions: cors.CorsOptionsDelegate = (req, callback) => {
	let _corsOptions: cors.CorsOptions = { allowedHeaders, methods: allowedMethods };
	const host = req.headers.host;
	if (subdomainWhitelist.test(host) || allowedHosts.includes(host)) {
		_corsOptions.origin = true; // reflect (enable) the requested origin in the CORS response
	} else {
		_corsOptions.origin = false; // disable CORS for this request
	}
	// console.log("_corsOptions :>> ", _corsOptions);
	callback(null, _corsOptions); // callback expects two parameters: error and options
};

/**
 * EXPRESS JS INITIALIZING
 */
let app: Express;
let server: Server;
let socketIO: SocketServer;
export let isServerReady = false;

export function setServerStatus(status: boolean) {
	isServerReady = status;
}

function initialize(db?: typeof mongoose) {
	// log(`Server is initializing...`);

	app = express();
	server = createServer(app);

	/**
	 * Websocket / SOCKET.IO
	 */
	socketIO = new SocketServer(server, { transports: ["websocket"] });
	socketIO.on("connection", (socket) => {
		// console.log("a user connected");

		socket.on("join", (data) => {
			// console.log("join room:", data);
			socket.join(data.room);
		});
	});

	/**
	 * CORS MIDDLEWARE
	 */
	app.use(
		// cors({
		// 	// credentials: IsDev() ? false : true,
		// 	// allowedOrigins: IsDev() ? "*" : allowedOrigins,
		// 	credentials: true,
		// 	allowedOrigins,
		// 	allowedHeaders,
		// 	methods: allowedMethods,
		// })
		cors(corsOptions)
	);

	// CREDITS
	app.use((req, res, next) => {
		res.header("X-Powered-By", "TOP GROUP");
		next();
	});

	/**
	 * SERVING STATIC & UPLOAD FILES
	 */
	app.use(express.static(path.resolve(CLI_DIR, "public")));
	app.use("/storage", express.static(path.resolve(CLI_DIR, "storage")));

	/**
	 * TODO: Enable SWAGGER for API Docs
	 * SWAGGER API DOCS
	 */
	app.use(
		"/api-docs",
		swaggerUi.serve,
		swaggerUi.setup(undefined, {
			swaggerOptions: { url: "/swagger.json" },
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
			name: Config.grab(`SESSION_NAME`, `diginext`),
			secret: Config.grab(`JWT_SECRET`),
			maxAge: 1000 * 60 * 100,
			httpOnly: false,
			secure: !IsDev() || !IsTest(),
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
	morgan.token("user", (req: AppRequest) => (req.user ? `[${req.user.slug}]` : "[unauthenticated]"));
	morgan.token("req-headers", (req: AppRequest) => JSON.stringify(req.headers));

	const morganMessage = IsDev()
		? "[REQUEST :date[clf]] :method - :user - :url :status :response-time ms - :res[content-length]"
		: `[REQUEST :date[clf]] :method - :user - ":url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"`;
	const morganOptions = {
		skip: (req: AppRequest, res) => {
			return req.method.toUpperCase() === "OPTIONS" || req.url?.indexOf("/.well-known") > -1 || req.url?.indexOf("/api/v1/stats/version") > -1;
		},
		// write logs to file
		// stream: accessLogStream,
	} as unknown as morgan.Options<Request, Response>;

	if (!IsTest()) app.use(morgan(morganMessage, morganOptions));

	// Public paths for HEALTHCHECK & Rest APIs:
	app.use(`/${BASE_PATH}`, routes);

	/**
	 * RATE LIMITING MIDDLEWARE
	 */
	const rateLimiter = new RateLimiterMongo({
		storeClient: db.connection,
		tableName: "auth-rate-limit",
		points: 5, // Requests
		duration: 60, // Per second(s)
		blockDuration: 60 * 60 * 1, // 1 hour
	});

	const authRateLimiterMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
		rateLimiter
			.consume(`${req.ip}-${req.headers["user-agent"]}`)
			.then(() => {
				// console.log("req.ip :>> ", req.ip);
				// console.log("req.headers['user-agent'] :>> ", req.headers["user-agent"]);
				next();
			})
			.catch(() => {
				if (!IsDev() && !IsTest()) {
					res.status(429).send("[BASIC AUTH] Too Many Requests");
				} else {
					next();
				}
			});
	};
	app.use(`/api/v1`, authRateLimiterMiddleware, basicAuthRouter);

	/**
	 * ROUTE 404 & FAIL SAFE HANDLING MIDDLEWARE
	 */
	// app.use("*", route404_handler);

	// make sure the Express app won't be crashed if there are any errors
	if (IsProd()) app.use(failSafeHandler);

	/**
	 * SERVER HANDLING
	 */
	function onConnect() {
		console.log(`Server is UP & listening at port ${PORT}...`);
	}

	server.on("error", async (error: any) => {
		logError(`[FAIL_SAFE_2]`, error);

		// save log to database
		// const { SystemLogService } = await import("@/services");
		const logSvc = new SystemLogService();
		logSvc.saveError(error, { name: "server-error" });
	});
	server.listen(PORT, onConnect);

	/**
	 * BUILD SERVER INITIAL START-UP SCRIPTS:
	 * - Connect GIT providers (if any)
	 * - Connect container registries (if any)
	 * - Connect K8S clusters (if any)
	 */
	startupScripts().catch((reason) => logWarn(reason));
}

if (CLI_MODE === "server") {
	// log(`Connecting to database. Please wait...`);
	AppDatabase.connect(initialize);

	/**
	 * Close the database connection when the application is terminated
	 */
	process.on("SIGINT", async () => {
		await AppDatabase.disconnect();
		process.exit(0);
	});
}

export const getIO = () => socketIO;

export { app, server, socketIO };
