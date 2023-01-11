import type { Driver } from "../../driver/Driver";
import type { ColumnMetadata } from "../../metadata/ColumnMetadata";
import type { TableColumnOptions } from "../options/TableColumnOptions";
export declare class TableUtils {
    static createTableColumnOptions(columnMetadata: ColumnMetadata, driver: Driver): TableColumnOptions;
}
