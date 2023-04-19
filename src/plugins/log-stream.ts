import { Writable } from "stream";

export class LogStream extends Writable {
	write(chunk: any, callback?: (error: Error) => void): boolean;
	write(chunk: any, encoding: BufferEncoding, callback?: (error: Error) => void): boolean;
	write(chunk: unknown, encoding?: unknown, callback?: unknown): boolean {
		console.log("line :>> ", chunk);
		return true;
	}
}
