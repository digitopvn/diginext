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
const { readJson, saveJson } = require("../dist/plugins");

// Demo project data:
const newProject = { name: "CLI Test Project", framework: "static" };
const projectSlug = makeSlug(newProject.name);
const testDomain = `${projectSlug}.zii.vn`;
const targetDir = path.resolve(os.homedir(), "diginext-cli", projectSlug);

describe("Deploy the project", function () {
	this.timeout(5 * 60 * 1000);

	before(async function () {
		// create new test project
		// const newProjectCommand = `di new --overwrite --install=false --framework=${newProject.framework} --projectName=\"${newProject.name}\" --projectSlug=${projectSlug} --namespace=${projectSlug}-ns --targetDir=${targetDir}`;
		// await execa.command(newProjectCommand);
	});

	it('Generate deployment for "DEV" environment', async function () {
		const cmdGenerate = `cd ${targetDir} && di deploy generate`;
		await execa.command(cmdGenerate);

		// check if file was generated successfully
		const deploymentYamlExisted = fs.existsSync(path.resolve(targetDir, "deployment/deployment.dev.yaml"));
		expect(deploymentYamlExisted).to.be.equal(true);
	});

	it('Generate deployment for "PROD" environment', async function () {
		// add test domain
		const diginextPath = path.resolve(targetDir, "di.json");
		// console.log("diginextPath :>> ", diginextPath);

		let diginext = readJson(diginextPath);
		diginext.domain = { ...diginext.domain, prod: [testDomain] };
		saveJson(diginext, diginextPath, { overwrite: true });
		// console.log("diginext :>> ", diginext);

		// generate prod deployment
		const cmdGenerate = `di deploy generate --prod --targetDir=${targetDir}`;
		await execa.command(cmdGenerate, cliOpts);

		// check if file was generated successfully
		const deploymentYamlExisted = fs.existsSync(path.resolve(targetDir, "deployment/deployment.prod.yaml"));
		expect(deploymentYamlExisted).to.be.equal(true);
	});

	after(async function () {
		// clean up test project
		// await del([targetDir], { force: true });
	});
});
