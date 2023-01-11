import BearerStrategy from "passport-http-bearer";
// import { Config } from "@/app.config";
// import { ProviderInfo } from "@/entities/User";
// import { userSvc } from "@/routes/auth/google/index";

export const bearerStrategy = new BearerStrategy(function (token, done) {
	// process.nextTick(async function () {
	// 	console.log(profile);
	// 	let user = await userSvc.findOne({ email: profile.email }, { populate: ["roles"] });
	// 	if (user) {
	// 		return done(null, { ...user, accessToken, refreshToken });
	// 	}
	// 	const provider: ProviderInfo = {
	// 		name: "google",
	// 		user_id: profile.id,
	// 		access_token: accessToken,
	// 	};
	// 	user = await userSvc.create({
	// 		providers: [provider],
	// 		name: profile.displayName,
	// 		email: profile.email,
	// 		image: profile.picture,
	// 		verified: profile.verified,
	// 	});
	// 	return done(null, { ...user, accessToken, refreshToken });
	// });
});
