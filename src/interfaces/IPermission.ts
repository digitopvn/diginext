export type IRouteScope = "all" | "workspace" | "team" | "project" | "app";

export type IRoutePermission = "full" | "own" | "create" | "read" | "update" | "delete";

export interface IRouteRole {
	scope: IRouteScope;
	permissions: IRoutePermission[];
}
