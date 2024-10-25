/**
 * Check if input string has characters are not a letter, digit, underscore
 */
export function containsSpecialCharacters(str: string) {
	const regex = /[^A-Za-z0-9_ ]/;
	return regex.test(str);
}

export function contains(text: string, words: string[]): boolean {
	return words.every((word) => text.includes(word));
}

export function filterSpecialChars(str: string) {
	// Biểu thức chính quy để loại bỏ các ký tự không phải là chữ cái hoặc số
	const regex = /[^a-zA-Z0-9 ]/g;
	return str.replace(regex, "");
}

export function containsChinese(str: string) {
	var reg = /[一-龥]/;
	return reg.test(str);
}

export function containsEmoji(str: string) {
	return /\p{Extended_Pictographic}/u.test(str);
}
