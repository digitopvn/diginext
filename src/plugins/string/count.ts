export function countLeadingSigns(inputString: string, characterToCount: string): number {
	let count = 0;
	for (const char of inputString) {
		if (char === characterToCount) {
			count++;
		} else {
			break;
		}
	}
	return count;
}
