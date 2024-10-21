/**
 * Generates a random string of the specified length using only digits and alphabet characters.
 * @param length - The length of the random string to generate.
 * @returns A random string of the specified length.
 */
export function generateRandomString(length: number): string {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		result += characters[randomIndex];
	}
	return result;
}
