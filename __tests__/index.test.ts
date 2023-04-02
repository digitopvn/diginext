import { setupTestEnvironment } from "./helpers";
import { checkInitialData } from "./core/initial-data";
import { checkSystemStatus } from "./core/system-status";

describe("Test suite", () => {
	setupTestEnvironment();

	// System
	checkSystemStatus();

	// Check initial data
	checkInitialData();
});

// nothing
export {};
