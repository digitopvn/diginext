import { setupEndTestEnvironment, setupStartTestEnvironment } from "./helpers";
import { checkInitialData } from "./core/initial-data";
import { checkSystemStatus } from "./core/system-status";

describe("Diginext server", () => {
	// Start
	beforeAll(async () => await setupStartTestEnvironment(), 15000);

	// 1. System
	checkSystemStatus();

	// 2. Check initial data
	checkInitialData();

	// End
	afterAll(async () => await setupEndTestEnvironment());
});

// nothing, just because Jest will not work without exporting something
export {};
