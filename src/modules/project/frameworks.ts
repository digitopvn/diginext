export type Framework =
	| "monorepo-all"
	| "monorepo-next-and-nest"
	| "monorepo-next-and-express"
	| "monorepo-next-and-socket"
	| "monorepo-next-and-docs"
	| "monorepo-digicms"
	| "diginext"
	| "diginext/tools/photo"
	| "diginext/tools/three"
	| "diginext/tools/backend"
	| "diginest"
	| "static"
	| "expressjs"
	| "none";

export const frameworks: Framework[] = [
	"monorepo-all",
	"monorepo-next-and-nest",
	"monorepo-next-and-express",
	"monorepo-next-and-socket",
	"monorepo-next-and-docs",
	"monorepo-digicms",
	"diginext",
	"diginext/tools/photo",
	"diginext/tools/three",
	"diginext/tools/backend",
	"diginest",
	"static",
	"expressjs",
	"none",
];

// TODO: Add/list/update/delete new framework with CLI

export default { frameworks };
