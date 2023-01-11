import type { ColumnType } from "../driver/types/ColumnTypes";
import type { DatabaseType } from "../driver/types/DatabaseType";
import type { ColumnMetadata } from "../metadata/ColumnMetadata";
import { TypeORMError } from "./TypeORMError";
export declare class DataTypeNotSupportedError extends TypeORMError {
    constructor(column: ColumnMetadata, dataType: ColumnType, database?: DatabaseType);
}
