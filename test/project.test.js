// import { processCLI } from "../src/index";
// import { InputOptions } from "../src/interfaces/InputOptions";
const { makeSlug } = require("diginext-utils/dist/Slug");

const fs = require("fs");
const path = require("path");
const os = require("os");
const execa = require("execa");
const del = require("del");
const expect = require("chai").expect;

const { cliOpts } = require("../dist/config/config");
const { execCmd } = require("../dist/plugins");

// Demo project data:
const newProject = { name: "CLI Test Project", framework: "diginext13" };
const projectSlug = makeSlug(newProject.name)
const targetDir = path.resolve(os.homedir(), "diginext-cli", projectSlug);

describe("Create new project", function () {
	this.timeout(5 * 60 * 1000);

	beforeEach(async function () {
		// if test dir is existed -> delete it !
		if (fs.existsSync(targetDir)) await del([targetDir], { force: true });
	});

	it("with 'Diginext' framework & create Bitbucket repository", async function () {
		const newProjectCommand = `dx new --force --install=false --git=false --fw=${newProject.framework} --namespace=\"${projectSlug}\" --projectName=\"${newProject.name}\" --projectSlug=\"${projectSlug}\" --targetDir=${targetDir}`;
		await execCmd(newProjectCommand);

		const dirExisted = fs.existsSync(targetDir);
		const gitDirExisted = fs.existsSync(path.resolve(targetDir, ".git"));
		const cliConfigFileExisted = fs.existsSync(path.resolve(targetDir, "dx.json"));
		// const envFileExisted = fs.existsSync(path.resolve(targetDir, "deployment/.env.dev"));

		expect(dirExisted).to.be.equal(true, "Project directory was not created.");

		expect(cliConfigFileExisted).to.be.equal(true, `"${projectSlug}/dx.json" is not existed.`);

		expect(gitDirExisted).to.be.equal(true, "GIT was not initialized properly.");

		// expect(envFileExisted).to.be.equal(true, "ENV file was not created properly.");

		// const envContent = fs.readFileSync(path.resolve(targetDir, "deployment/.env.dev"), "utf8");
		// expect(envContent).to.contain.oneOf([
		// 	`BASE_PATH="${projectSlug}"`,
		// 	`BASE_PATH=${projectSlug}`,
		// 	`BASE_PATH="${projectSlug}/backend"`,
		// 	`BASE_PATH=${projectSlug}/backend`
		// ], "BASE_PATH was not setup properly.");
	});

	afterEach(async function () {
		// clean up test dir
		if (fs.existsSync(targetDir)) await del([targetDir], { force: true });
	});
});
