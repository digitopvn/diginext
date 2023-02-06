import listEndpoints from "express-list-endpoints";

import { app } from "@/server";

export const seedRoutes = async () => {
	console.log("listEndpoints >>", listEndpoints(app));
};

// export default { seedRoutes };
