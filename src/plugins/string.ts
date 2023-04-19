export function contains(text: string, words: string[]): boolean {
	for (let i = 0; i < words.length; i++) {
		if (!text.includes(words[i])) {
			return false;
		}
	}
	return true;
}
