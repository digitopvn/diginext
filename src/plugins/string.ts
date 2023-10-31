export function contains(text: string, words: string[]): boolean {
	for (let i = 0; i < words.length; i++) {
		if (!text.includes(words[i])) {
			return false;
		}
	}
	return true;
}

export function extractTextBetweenBackticks(input: string): string {
	const regex = /```(.*?)```/s;
	const match = input.match(regex);
	return match ? match[1].trim() : input;
}

/**
 * Check if input string has characters are not a letter, digit, underscore
 */
export function containsSpecialCharacters(str: string) {
	const regex = /[^A-Za-z0-9_ ]/;
	return regex.test(str);
}
