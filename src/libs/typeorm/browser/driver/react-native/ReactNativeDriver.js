import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import { ReactNativeQueryRunner } from "./ReactNativeQueryRunner";
import { DriverOptionNotSetError } from "../../error/DriverOptionNotSetError";
import { DriverPackageNotInstalledError } from "../../error/DriverPackageNotInstalledError";
export class ReactNativeDriver extends AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        this.database = this.options.database;
        // validate options to make sure everything is set
        if (!this.options.database)
            throw new DriverOptionNotSetError("database");
        if (!this.options.location)
            throw new DriverOptionNotSetError("location");
        // load sqlite package
        this.loadDependencies();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Closes connection with database.
     */
    async disconnect() {
        return new Promise((ok, fail) => {
            this.queryRunner = undefined;
            this.databaseConnection.close(ok, fail);
        });
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode) {
        if (!this.queryRunner)
            this.queryRunner = new ReactNativeQueryRunner(this);
        return this.queryRunner;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    createDatabaseConnection() {
        return new Promise((ok, fail) => {
            const options = Object.assign({}, {
                name: this.options.database,
                location: this.options.location,
            }, this.options.extra || {});
            this.sqlite.openDatabase(options, (db) => {
                const databaseConnection = db;
                // we need to enable foreign keys in sqlite to make sure all foreign key related features
                // working properly. this also makes onDelete work with sqlite.
                databaseConnection.executeSql(`PRAGMA foreign_keys = ON`, [], (result) => {
                    ok(databaseConnection);
                }, (error) => {
                    fail(error);
                });
            }, (error) => {
                fail(error);
            });
        });
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        try {
            const sqlite = this.options.driver || require("react-native-sqlite-storage");
            this.sqlite = sqlite;
        }
        catch (e) {
            throw new DriverPackageNotInstalledError("React-Native", "react-native-sqlite-storage");
        }
    }
}

//# sourceMappingURL=ReactNativeDriver.js.map
