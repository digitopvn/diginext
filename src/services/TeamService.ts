import type { ITeam } from "@/entities/Team";
import { teamSchema } from "@/entities/Team";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class TeamService extends BaseService<ITeam> {
	constructor(ownership?: Ownership) {
		super(teamSchema, ownership);
	}
}
