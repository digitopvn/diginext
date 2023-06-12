import type express from "express";
import { RateLimiterMongo } from "rate-limiter-flexible";

import AppDatabase from "@/modules/AppDatabase";

const { db } = AppDatabase;

const rateLimiter = new RateLimiterMongo({
	storeClient: db,
	tableName: "auth-rate-limit",
	points: 5, // Requests
	duration: 60, // Per second(s)
	blockDuration: 60 * 60 * 1, // 1 hour
});

const authRateLimiterMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	rateLimiter
		.consume(`${req.ip}-${req.headers["user-agent"]}`)
		.then(() => {
			next();
		})
		.catch(() => {
			res.status(429).send("Too Many Requests");
		});
};

export default authRateLimiterMiddleware;
