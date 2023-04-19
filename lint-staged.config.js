module.exports = {
	"*.{js,jsx,ts,tsx}": ["eslint --fix"],
	"**/*.ts?(x)": () => "npm run check-types",
	"*.{json,yaml}": ["prettier --write"],
};
