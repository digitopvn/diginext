export function ellipsis(str: string, length: number) {
	return str.length > length ? str.slice(0, length) + "..." : str;
}

export function formatBytes(bytes: number, decimals = 2) {
	//
	try {
		if (bytes === 0) return "0 Bytes";

		const k = 1000;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
	} catch (error) {
		throw new Error(`formatBytes failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}
