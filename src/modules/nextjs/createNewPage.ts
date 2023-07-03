import { makeSlug } from "diginext-utils/dist/Slug";
import { capitalizeName, clearUnicodeCharacters } from "diginext-utils/dist/string";
import * as fs from "fs";
import path from "path";

import type { InputOptions } from "@/interfaces";

type AdditionalType = {
	_: string[];
	e: boolean;
	example: boolean;
	b: boolean;
	blank: boolean;
};

type ExtendedType = InputOptions & AdditionalType;

const generateName = (name: string) => {
	//
	name = capitalizeName(clearUnicodeCharacters(name)).replace(/\ /g, "");
	return name;
};

const generateFileName = (name: any) => {
	//

	name = makeSlug(clearUnicodeCharacters(name));
	return name;
};

export default async function createNewPage(options: ExtendedType) {
	//

	const isExample = options.e || options.example;
	const isBlank = options.b || options.blank;

	const DIR_NAME = process.cwd();

	const list = options._.slice();
	list.shift();

	const pathPages = list.map((x) => {
		const name = generateName(x);
		const nameComponent = `Page${name}`;
		const fileName = generateFileName(x);
		return {
			name,
			nameComponent,
			fileName,

			targetPathFile: {
				page: isExample
					? //
					  `src/pages/examples/${fileName}.tsx`
					: `src/pages/${fileName}.tsx`,
				component: isExample ? `src/components/router/examples/${nameComponent}.tsx` : `src/components/router/${nameComponent}.tsx`,
			},
			template: {
				page: isBlank
					? path.resolve(__dirname, "../templates/nextjs/ts/0.1/pages/blank.txt")
					: path.resolve(__dirname, "../templates/nextjs/ts/0.1/pages/page-name.txt"),
				component: isBlank
					? path.resolve(__dirname, "../templates/nextjs/ts/0.1/components/blank.txt")
					: path.resolve(__dirname, "../templates/nextjs/ts/0.1/components/page-name.txt"),
			},
		};
	});

	await Promise.all(
		pathPages.map(({ name, nameComponent, fileName, template, targetPathFile }) => {
			const { page, component } = targetPathFile;

			const contentPage = fs
				.readFileSync(template.page, "utf-8")
				.replace(
					/@@URL/g,
					page
						//
						.replace("src/pages/", "/")
						.replace(".tsx", "")
				)
				.replace(/@@PAGE_NAME/g, capitalizeName(fileName))
				.replace(/@@PAGE_FILE_NAME/g, name)
				.replace(/\\t/g, "\t")
				.replace(/@@PATH_COMPONENT/g, component.replace("src/", "@/").replace(".tsx", ""));

			const contentComponent = fs
				.readFileSync(template.component, "utf-8")
				.replace(/\\t/g, "\t")
				.replace(/@@PAGE_FILE_NAME/g, name);

			const pagePath = `${DIR_NAME}/${page}`.replace(`/${fileName}.tsx`, "");
			const componentPath = `${DIR_NAME}/${component}`.replace(`/${nameComponent}.tsx`, "");

			if (!fs.existsSync(pagePath)) {
				fs.mkdirSync(pagePath, { recursive: true });
			}

			if (!fs.existsSync(componentPath)) {
				fs.mkdirSync(componentPath, { recursive: true });
			}

			fs.writeFileSync(`${DIR_NAME}/${page}`, contentPage);
			fs.writeFileSync(`${DIR_NAME}/${component}`, contentComponent);
		})
	);

	//
}
export { createNewPage };
