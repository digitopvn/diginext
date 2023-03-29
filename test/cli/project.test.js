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
const { CLI_CONFIG_DIR } = require("../dist/config/const");

// Demo project data:
const newProject = { name: "CLI Test Project", framework: "diginext13" };
const projectSlug = makeSlug(newProject.name)
const targetDir = path.resolve(CLI_CONFIG_DIR, "test", projectSlug);

describe("Create new project", function () {
	this.timeout(5 * 60 * 1000);

	beforeEach(async function () {
		// if test dir is existed -> delete it !
		if (fs.existsSync(targetDir)) await del([targetDir], { force: true });
	});

	it("with 'Static' framework & create Bitbucket repository", async function () {
		const newProjectCommand = `dx new --force --install=false --git=false --fw=${newProject.framework} --namespace=\"${projectSlug}\" --projectName=\"${newProject.name}\" --projectSlug=\"${projectSlug}\" --targetDir=${targetDir}`;
		await execCmd(newProjectCommand);

		const dirExisted = fs.existsSync(targetDir);
		const gitDirExisted = fs.existsSync(path.resolve(targetDir, ".git"));
		const cliConfigFileExisted = fs.existsSync(path.resolve(targetDir, "dx.json"));
		// const envFileExisted = fs.existsSync(path.resolve(targetDir, "deployment/.env.dev"));

		expect(dirExisted).to.be.equal(true, "Project directory was not created.");

		expect(cliConfigFileExisted).to.be.equal(true, `"${projectSlug}/dx.json" is not existed.`);

		expect(gitDirExisted).to.be.equal(true, "GIT was not initialized properly.");
	});

	afterEach(async function () {
		// hard delete project in database

		// clean up test dir
		if (fs.existsSync(targetDir)) await del([targetDir], { force: true });
	});
});
