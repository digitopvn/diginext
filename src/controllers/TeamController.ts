import TeamService from "@/services/TeamService";

import BaseController from "./BaseController";

export default class TeamController extends BaseController<TeamService> {
	constructor() {
		super(new TeamService());
	}
}
