import inquirer from "inquirer";

export const askForNewValue = async <T = string>(title?: string) => {
	const { value } = await inquirer.prompt<{ value: T }>({
		name: "value",
		type: "input",
		message: title || `New value:`,
	});
	return value;
};
