import UserService from "../services/UserService";
import BaseController from "./BaseController";

export default class UserController extends BaseController<UserService> {
	constructor() {
		super(new UserService());
	}
}
