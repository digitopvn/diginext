var osvar = process.platform;

export function getOS() {
	if (osvar == "darwin") {
		return "mac";
	} else if (osvar == "win32") {
		return "win";
	} else if (osvar == "linux") {
		return "linux";
	} else {
		return osvar;
	}
}

export function isWin() {
	return osvar == "win32";
}

export function isMac() {
	return osvar == "darwin";
}

export function isLinux() {
	return osvar == "darwin";
}
