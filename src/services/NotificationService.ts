import type { INotification } from "@/entities/Notification";
import { notificationSchema } from "@/entities/Notification";

import BaseService from "./BaseService";

export class NotificationService extends BaseService<INotification> {
	constructor() {
		super(notificationSchema);
	}
}
