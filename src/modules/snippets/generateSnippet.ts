import createNewPage from "@/modules/snippets/createNewPage";

export default async function generateSnippet(options: any) {
	//
	switch (options.secondAction) {
		case "new-page":
		case "np":
		case "page":
			{
				createNewPage(options);
			}
			break;

		default:
			break;
	}
	//
}
export { generateSnippet };
