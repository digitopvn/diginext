import { setupEndTestEnvironment, setupStartTestEnvironment } from "./helpers";
import { checkInitialData } from "./core/initial-data";
import { checkSystemStatus } from "./core/system-status";

describe("Diginext server", () => {
	// Start
	beforeAll(async () => await setupStartTestEnvironment(), 15000);
	// End
	afterAll(async () => await setupEndTestEnvironment());

	// 1. System
	checkSystemStatus();

	// 2. Check initial data
	checkInitialData();
});

// nothing, just because Jest will not work without exporting something
export {};
