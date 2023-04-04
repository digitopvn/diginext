import inquirer from "inquirer";

export const askForImageURL = async () => {
	const { imageURL } = await inquirer.prompt<{ imageURL: string }>({
		name: "imageURL",
		type: "input",
		validate: (input) => input && input.length > 0,
	});
	return imageURL;
};
