import { isEmpty } from "lodash";
import GoogleStrategy from "passport-google-oauth2";

import { Config } from "@/app.config";
import type { ProviderInfo, UserDto } from "@/entities/User";
import UserService from "@/services/UserService";

export const googleStrategy = new GoogleStrategy(
	{
		clientID: Config.grab("GOOGLE_CLIENT_ID", "g0fTFGUDWCjmH21MnxTIcsPtD8JHDa2aA8UNgCpp2r2cf58aMlIut1gJ7abGotPi"),
		clientSecret: Config.grab("GOOGLE_CLIENT_SECRET", "c5ENUrEiyMXfgQ7nbZS26GTfr4rOxBP1xcx34p8OD7yIBwVmqLyumYdd0niy2dKe"),
		callbackURL: `${Config.BASE_URL}${Config.grab("GOOGLE_CALLBACK_PATH", "/auth/google/callback")}`,
		userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
		passReqToCallback: true,
	},
	function (request, accessToken, refreshToken, profile, done) {
		process.nextTick(async function () {
			// console.log(`googleStrategy :>>`, { profile });
			// console.log(accessToken);
			// console.log(`googleStrategy :>> profile.email =`, profile.email);

			const userSvc = new UserService();
			let user = await userSvc.findOne({ email: profile.email }, { populate: ["roles"] });
			// console.log("[google login] user :>> ", user);
			// console.log(`googleStrategy :>>`, { user });

			if (user) {
				const updateData = {} as UserDto;
				if (user.image != profile.picture) updateData.image = profile.picture;
				if (user.name != profile.displayName) updateData.name = profile.displayName;

				if (!isEmpty(updateData)) [user] = await userSvc.update({ _id: user._id }, updateData);

				request.user = user;

				return done(null, { ...user, accessToken, refreshToken });
			}

			const provider: ProviderInfo = {
				name: "google",
				user_id: profile.id,
				access_token: accessToken,
			};

			const newUser = await userSvc.create({
				providers: [provider],
				name: profile.displayName,
				email: profile.email,
				image: profile.picture,
				verified: profile.verified,
			});

			if (newUser) {
				user = newUser;
				request.user = user;
				return done(null, { ...user, accessToken, refreshToken });
			} else {
				return done(null, newUser);
			}
		});
	}
);
