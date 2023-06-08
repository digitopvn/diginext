import inquirer from "inquirer";

export const askForTargetProp = async (type: string) => {
	switch (type) {
		case "deploy":
		case "deployment":
			const deployProps: string[] = ["image", "imagePullSecrets", "port", "size"];
			const { propName } = await inquirer.prompt<{ propName: string }>({
				name: "propName",
				type: "list",
				message: `Select property:`,
				default: deployProps[0],
				choices: deployProps.map((name, i) => {
					return { name: `[${i + 1}] ${name}`, value: name };
				}),
			});
			return propName;

		default:
			break;
	}
};
