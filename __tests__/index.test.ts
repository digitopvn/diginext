import { setupEndTestEnvironment, setupStartTestEnvironment } from "./helpers";
import { checkInitialData } from "./core/initial-data";
import { checkSystemStatus } from "./core/system-status";
import { testFlow1 } from "./flows/test-flow-1";

describe("Diginext server", () => {
	// Start
	beforeAll(async () => await setupStartTestEnvironment(), 15000);

	// 1. System
	checkSystemStatus();

	// 2. Check initial data
	checkInitialData();

	// 3. Flow 1: all core features
	testFlow1();

	// End
	afterAll(async () => await setupEndTestEnvironment());
});

// nothing, just because Jest will not work without exporting something
export {};
