import chalk from "chalk";
import { makeSlug } from "diginext-utils/dist/Slug";
import { capitalizeName, clearUnicodeCharacters } from "diginext-utils/dist/string";
import fs from "fs";
import path from "path";

import type { InputOptions } from "@/interfaces";

type AdditionalType = {
	_: string[];
	e: boolean;
	example: boolean;
	b: boolean;
	blank: boolean;
	t: boolean;
	three: boolean;
	p: boolean;
	pixi: boolean;
	o: boolean;
	overwrite: boolean;
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
	const isThree = options.t || options.three;
	const isPixi = options.p || options.pixi;
	const isOverwrite = options.o || options.overwrite;

	const DIR_NAME = process.cwd();

	const args = options._.slice();
	args.shift();
	args.shift();

	const checkFramework = () => {
		//
		if (fs.existsSync(path.resolve(DIR_NAME, "package.json"))) {
			const { dependencies } = require(path.resolve(DIR_NAME, "package.json"));
			const { next } = dependencies;

			if (next) {
				if (!fs.existsSync(path.resolve(DIR_NAME, "tsconfig.json"))) {
					//
					console.log(chalk.red(`Not found tsconfig.json`));
					console.log(chalk.red(`Support typescript only`));
					return false;
				}
			} else {
				console.log(chalk.red(`Not found NextJS`));
				return false;
			}
		} else {
			console.log(chalk.red(`Not found package.json`));
			return false;
		}

		return true;
	};

	if (!checkFramework()) return;

	const pathPages = args.map((x) => {
		const name = generateName(x);
		const nameComponent = `Page${name}`;
		const fileName = generateFileName(x);

		let PATH_PAGE = "pages";
		let PATH_COMPONENT_PAGE = "components/router";
		let PATH_MODULE = "modules";

		let PAGE_TEMPLATE_FILENAME = "page-name";
		let COMPONENT_TEMPLATE_FILENAME = "page-name";

		const list = [];

		if (isExample) {
			PATH_PAGE = "pages/examples";
			PATH_COMPONENT_PAGE = "components/router/examples";
		}

		switch (true) {
			//
			case isBlank:
				{
					PAGE_TEMPLATE_FILENAME = "blank";
					COMPONENT_TEMPLATE_FILENAME = "blank";
				}
				break;

			case isThree:
				{
					PAGE_TEMPLATE_FILENAME = "page-name";
					COMPONENT_TEMPLATE_FILENAME = "three";
					PATH_MODULE = "modules/three/scenes";

					const nameClass = `${name}Scene`;
					//
					list.push({
						source: path.resolve(__dirname, `../templates/nextjs/ts/0.1/modules/three.txt`),
						target: `src/${PATH_MODULE}/${nameClass}.tsx`,
						replaces: [
							{
								source: /\\t/g,
								target: "\t",
							},
							{
								source: /@@PAGE_FILE_NAME/g,
								target: name,
							},
						],
					});
				}
				break;

			case isPixi:
				{
					PAGE_TEMPLATE_FILENAME = "page-name";
					COMPONENT_TEMPLATE_FILENAME = "pixi";
					PATH_MODULE = "modules/pixi/scenes";
					const nameClass = `${name}Scene`;
					//
					list.push({
						source: path.resolve(__dirname, `../templates/nextjs/ts/0.1/modules/pixi.txt`),
						target: `src/${PATH_MODULE}/${nameClass}.tsx`,
						replaces: [
							{
								source: /\\t/g,
								target: "\t",
							},
							{
								source: /@@PAGE_FILE_NAME/g,
								target: name,
							},
						],
					});
				}
				break;

			default:
				break;
		}

		list.push(
			...[
				{
					source: path.resolve(__dirname, `../templates/nextjs/ts/0.1/pages/${PAGE_TEMPLATE_FILENAME}.txt`),
					target: `src/${PATH_PAGE}/${fileName}.tsx`,
					replaces: [
						//
						{
							source: /\\t/g,
							target: "\t",
						},
						{
							source: /@@URL/g,
							target: `/${fileName}`,
						},
						{
							source: /@@PAGE_NAME/g,
							target: capitalizeName(fileName),
						},
						{
							source: /@@PAGE_FILE_NAME/g,
							target: name,
						},
						{
							source: /@@PATH_COMPONENT/g,
							target: `@/${PATH_COMPONENT_PAGE}/${nameComponent}`,
						},
					],
				},
				{
					source: path.resolve(__dirname, `../templates/nextjs/ts/0.1/components/${COMPONENT_TEMPLATE_FILENAME}.txt`),
					target: `src/${PATH_COMPONENT_PAGE}/${nameComponent}.tsx`,
					replaces: [
						//
						{
							source: /\\t/g,
							target: "\t",
						},
						{
							source: /@@PAGE_FILE_NAME/g,
							target: name,
						},
					],
				},
			]
		);

		return {
			name,
			list,
		};
	});

	const createaFileAndReplaceText = async (
		list: {
			source: string;
			target: string;
			replaces: {
				source: RegExp;
				target: string;
			}[];
		}[]
	) => {
		await Promise.all(
			list.map(async ({ source, target, replaces }) => {
				//

				let content = fs.readFileSync(source, "utf-8");
				replaces.forEach((item) => {
					content = content.replace(item.source, item.target);
				});

				const dirPath = path.dirname(`${DIR_NAME}/${target}`);
				if (fs.existsSync(target)) {
					if (isOverwrite) {
						//
						console.log(chalk.green(`Overwrite ${target}!`));
					} else {
						console.log(chalk.yellow(`Found ${target} exited! do you want use -o or --overwrite?`));
						return;
					}
				}

				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, { recursive: true });
				}

				fs.writeFileSync(`${DIR_NAME}/${target}`, content);
			})
		);
		//
	};

	await Promise.all(
		pathPages.map(async ({ name, list }) => {
			await createaFileAndReplaceText(list);
		})
	);

	//
}
export { createNewPage };
