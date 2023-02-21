import type * as express from "express";
import * as jwt from "jsonwebtoken";

export function swaggerAuthentication(request: express.Request, securityName: string, scopes?: string[]): Promise<any> {
	if (securityName === "jwt") {
		const token = request.body.access_token || request.query.access_token || request.headers.Authorization || request.cookies["x-auth-cookie"];
		console.log("swaggerAuthentication > token :>> ", token);
		return new Promise((resolve, reject) => {
			if (!token) {
				reject(new Error("No token provided"));
			}
			jwt.verify(token, "[secret]", function (err: any, decoded: any) {
				if (err) {
					reject(err);
				} else {
					// Check if JWT contains all required scopes
					for (let scope of scopes) {
						if (!decoded.scopes.includes(scope)) {
							reject(new Error("JWT does not contain required scope."));
						}
					}
					resolve(decoded);
				}
			});
		});
	}
}
