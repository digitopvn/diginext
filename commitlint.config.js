module.exports = {
    extends: ["@commitlint/config-conventional"],
    ignores: [(message) => /chore/m.test(message)],
    rules: {
        'body-max-line-length': [0, 'always', 100],
		"subject-case": [0, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
	},
};
