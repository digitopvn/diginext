import { Config } from "@/app.config";
import type { IRole, IUser, IWorkspace } from "@/entities";
import { credentialFields, guestRoleRoutes, memberRoleRoutes, moderatorRoleRoutes } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

// seed default roles of a workspace
export const seedDefaultRoles = async (workspace: IWorkspace, owner: IUser) => {
	// console.log("Seeding default roles...");
	const { DB } = await import("@/modules/api/DB");

	// ADMIN
	let adminRole = await DB.findOne("role", { type: "admin", workspace: workspace._id });
	let adminMaskedFields: string[] = [];
	if (!Config.SHARE_RESOURCE_CREDENTIAL) adminMaskedFields = [...credentialFields];

	if (!adminRole) {
		const adminRoleDto = {} as IRole;
		adminRoleDto.name = "Administrator";
		adminRoleDto.routes = [{ path: "*", permissions: ["full"] }];
		adminRoleDto.workspace = workspace._id;
		adminRoleDto.type = "admin";
		adminRoleDto.maskedFields = adminMaskedFields;

		adminRole = await DB.create("role", adminRoleDto);
	} else {
		if (adminRole.maskedFields?.join(",") !== adminMaskedFields.join(",")) {
			adminRole = await DB.updateOne("role", { _id: adminRole._id }, { maskedFields: adminMaskedFields });
		}
	}

	// assign admin role to the "owner" user
	const fullOwner = await DB.findOne("user", { _id: owner._id }, { populate: ["roles", "activeWorkspace"] });

	let ownerRoles = (fullOwner?.roles || []) as IRole[];

	const ownerHasAdminRole = ownerRoles.map((role) => role._id).includes(MongoDB.toString(adminRole._id));

	if (!ownerHasAdminRole) {
		ownerRoles = ownerRoles.filter((role) => MongoDB.toString(role.workspace) !== MongoDB.toString(workspace._id));
		ownerRoles.push(adminRole);
		// update role ids
		const roleIds = ownerRoles.map((role) => role._id);
		const [user] = await DB.update("user", { _id: owner._id }, { roles: roleIds });
	}

	// MEMBER
	let memberRole = await DB.findOne("role", { type: "member", workspace: workspace._id });
	const memberRoleMaskedFields = ["email", ...credentialFields];

	if (!memberRole) {
		const memberRoleDto = {} as IRole;
		memberRoleDto.name = "Member";
		memberRoleDto.routes = memberRoleRoutes;
		memberRoleDto.workspace = workspace._id;
		memberRoleDto.type = "member";
		memberRoleDto.maskedFields = memberRoleMaskedFields;

		memberRole = await DB.create("role", memberRoleDto);
	} else {
		// Update maskFields if it's not correct
		if (memberRole.maskedFields?.join(",") !== memberRoleMaskedFields.join(",")) {
			memberRole = await DB.updateOne("role", { _id: memberRole._id }, { maskedFields: memberRoleMaskedFields });
		}

		// compare routes & permissions, if it doesn't match -> update!
		const defaultMemberRoleRoutes = memberRoleRoutes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		const dbMemberRoleRoutes = memberRole.routes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		// console.log("defaultMemberRoleRoutes :>> ", defaultMemberRoleRoutes);
		// console.log("dbMemberRoleRoutes :>> ", dbMemberRoleRoutes);
		if (defaultMemberRoleRoutes !== dbMemberRoleRoutes) {
			memberRole = await DB.updateOne("role", { _id: memberRole._id }, { routes: memberRoleRoutes });
		}
	}

	// MODERATOR
	let moderatorRole = await DB.findOne("role", { type: "moderator", workspace: workspace._id });

	if (!moderatorRole) {
		const moderatorRoleDto = {} as IRole;
		moderatorRoleDto.name = "Moderator";
		moderatorRoleDto.routes = moderatorRoleRoutes;
		moderatorRoleDto.workspace = workspace._id;
		moderatorRoleDto.type = "moderator";
		moderatorRoleDto.maskedFields = adminMaskedFields;

		moderatorRole = await DB.create("role", moderatorRoleDto);
	} else {
		// Update maskedFields if it is incorrect
		if (moderatorRole.maskedFields?.join(",") !== adminMaskedFields.join(",")) {
			moderatorRole = await DB.updateOne("role", { _id: moderatorRole._id }, { maskedFields: adminMaskedFields });
		}

		// compare routes & permissions, if it doesn't match -> update!
		const defaultModRoleRoutes = moderatorRoleRoutes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		const dbModRoleRoutes = moderatorRole.routes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		if (defaultModRoleRoutes !== dbModRoleRoutes) {
			moderatorRole = await DB.updateOne("role", { _id: moderatorRole._id }, { routes: moderatorRoleRoutes });
		}
	}

	// GUEST
	let guestRole = await DB.findOne("role", { type: "guest", workspace: workspace._id });

	if (!guestRole) {
		const guestRoleDto = {} as IRole;
		guestRoleDto.name = "Guest";
		guestRoleDto.routes = guestRoleRoutes;
		guestRoleDto.workspace = workspace._id;
		guestRoleDto.type = "guest";
		guestRoleDto.maskedFields = adminMaskedFields;

		guestRole = await DB.create("role", guestRoleDto);
	} else {
		// Update maskedFields if it is incorrect
		if (guestRole.maskedFields?.join(",") !== adminMaskedFields.join(",")) {
			guestRole = await DB.updateOne("role", { _id: guestRole._id }, { maskedFields: adminMaskedFields });
		}

		// compare name, if it doesn't match -> update!
		if (guestRole.name !== "Guest") guestRole = await DB.updateOne("role", { _id: guestRole._id }, { name: "Guest" });

		// compare routes & permissions, if it doesn't match -> update!
		const defaultGuestRoleRoutes = guestRoleRoutes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		const dbGuestRoleRoutes = guestRole.routes.map((r) => `${r.path}:${r.permissions?.join(",")}`).join("|");
		if (defaultGuestRoleRoutes !== dbGuestRoleRoutes) {
			guestRole = await DB.updateOne("role", { _id: guestRole._id }, { routes: guestRoleRoutes });
		}
	}

	return [adminRole, memberRole, moderatorRole, guestRole];
};
