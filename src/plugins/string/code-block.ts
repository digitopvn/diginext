/**
 * Extract text between backticks
 * @param input
 * @returns
 */
export function extractTextBetweenBackticks(input: string) {
	const regex = /```(?:\w+\n)?([\s\S]*?)```/s;
	const match = input.match(regex);
	return match ? match[1]?.toString().trim() : input;
}

/**
 * Separate code blocks from AI messages
 */
export function splitCodeSnippets(input: string): string[] {
	// The regex pattern captures both code blocks and texts around them.
	const codeBlockRegex = /(```[\s\S]*?```|```[a-z]+\n[\s\S]*?\n```)/g;

	// Initialize an array to hold the parts of the string
	const result: string[] = [];

	// Split the input text by the regex, keeping the code blocks in the result
	let lastIndex = 0;
	let match;
	while ((match = codeBlockRegex.exec(input)) !== null) {
		// Get the text before the current code block
		if (match.index > lastIndex) {
			result.push(input.slice(lastIndex, match.index).trim());
		}
		// Add the code block
		result.push(match[0].trim());
		lastIndex = match.index + match[0].length;
	}

	// Add any remaining text after the last code block
	if (lastIndex < input.length) {
		result.push(input.slice(lastIndex).trim());
	}

	// Filter out any empty strings that might be present
	return result.filter(Boolean);
}
