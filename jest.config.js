/**
 * @type {import("ts-jest").JestConfigWithTsJest}
 */
module.exports = {
	transform: {
		"^.+\\.tsx?$": "ts-jest"
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^libs/(.*)$': '<rootDir>/libs/$1',
	},
	// testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
	testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	collectCoverage: false,
	testEnvironment: "node",
	coverageReporters: ["json", "lcov", "text", "clover"], // "text-summary"
	modulePathIgnorePatterns: ["node_modules", ".temp"],
	bail: 1,
};