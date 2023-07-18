import type { IWebhook } from "@/entities/Webhook";
import { webhookSchema } from "@/entities/Webhook";

import BaseService from "./BaseService";

export class WebhookService extends BaseService<IWebhook> {
	constructor() {
		super(webhookSchema);
	}
}
