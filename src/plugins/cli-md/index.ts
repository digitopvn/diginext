import cliHtml from "cli-html";
import { marked } from "marked";
import emoji from "node-emoji";

/**
 * @param text
 */
function insertEmojis(text) {
	return text.replace(/:([\w+\-]+?):/g, (emojiString) => {
		const emojiSign = emoji.get(emojiString);
		if (!emojiSign) return emojiString;
		return `${emojiSign} `;
	});
}

marked.setOptions({
	renderer: new marked.Renderer(),
	pedantic: false,
	sanitize: false,
	smartLists: true,
	xhtml: false,
	breaks: false,
	gfm: true,
	smartypants: false,
	baseUrl: undefined,
	headerIds: true,
	headerPrefix: "",
	langPrefix: "language-",
	mangle: true,
	sanitizer: undefined,
	silent: false,
});

const markdownToCli = (markdown) => cliHtml(marked(insertEmojis(markdown)));

export default markdownToCli;
