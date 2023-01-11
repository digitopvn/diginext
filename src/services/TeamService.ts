import Team from "@/entities/Team";

import BaseService from "./BaseService";

export default class TeamService extends BaseService<Team> {
	constructor() {
		super(Team);
	}
}
export { TeamService };
