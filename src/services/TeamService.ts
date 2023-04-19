import type { ITeam } from "@/entities/Team";
import { teamSchema } from "@/entities/Team";

import BaseService from "./BaseService";

export default class TeamService extends BaseService<ITeam> {
	constructor() {
		super(teamSchema);
	}
}
export { TeamService };
