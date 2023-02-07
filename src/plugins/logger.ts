import * as fs from "fs";
import path from "path";

import { CLI_DIR } from "@/config/const";

export class Logger {
	name: string;

	fileName: string;

	dir: string;

	filePath: string;

	constructor(name: string) {
		this.name = name;
		this.fileName = name + ".txt";

		this.dir = process.env.LOG_DIR ?? path.resolve(CLI_DIR, "public/logs");
		if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });

		this.filePath = path.resolve(this.dir, this.fileName);
	}

	static getLogs(slug: string) {
		const dir = process.env.LOG_DIR ?? path.resolve(CLI_DIR, "public/logs");
		const filePath = path.resolve(dir, `${slug}.txt`);
		return fs.readFileSync(filePath, "utf8");
	}

	read() {
		if (fs.existsSync(this.filePath)) {
			return fs.readFileSync(this.filePath, "utf8");
		} else {
			return "";
		}
	}

	append(str) {
		const content = this.read();
		fs.writeFileSync(this.filePath, content + "\n" + str, { flag: "w", encoding: "utf8" });
	}
}
