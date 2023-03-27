import type * as express from "express";
import * as jwt from "jsonwebtoken";

import { Config } from "@/app.config";

/**
 * I HAVE NOT USE THIS YET !!! (lol)
 * ---
 * But SwaggerUI authentication is still working (I don't know why, but who cares), so I just leave this function here just in case.
 * @copyright https://tsoa-community.github.io/docs/authentication.html
 */

export function swaggerAuthentication(request: express.Request, securityName: string, scopes?: string[]): Promise<any> {
	if (securityName === "jwt") {
		const token = request.body.access_token || request.query.access_token || request.headers.Authorization || request.cookies["x-auth-cookie"];
		console.log("swaggerAuthentication > token :>> ", token);
		return new Promise((resolve, reject) => {
			if (!token) {
				reject(new Error("No token provided"));
			}
			jwt.verify(token, Config.grab("JWT_SECRET"), function (err: any, decoded: any) {
				if (err) reject(err);

				// // Check if JWT contains all required scopes
				// for (let scope of scopes) {
				// 	if (!decoded.scopes.includes(scope)) {
				// 		reject(new Error("JWT does not contain required scope."));
				// 	}
				// }

				resolve(decoded);
			});
		});
	} else if (securityName === "apiKey") {
		const token = request.headers.API_ACCESS_TOKEN;
		return new Promise((resolve, reject) => {
			if (!token) reject(new Error("No token provided"));
			resolve(token);
		});
	}
}
