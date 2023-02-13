import { randomBytes } from "crypto";

export default function generateUniqueString(): string {
	const buffer = randomBytes(32);
	const array = new Uint32Array(buffer.buffer);
	return Array.from(array, (dec) => ("0" + dec.toString(16)).substring(-2)).join("");
}
