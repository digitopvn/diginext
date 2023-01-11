export type IRouteScope = "all" | "workspace" | "team" | "app" | "own";

export type IRoutePermission = "full" | "create" | "read" | "update" | "delete";

export interface IRouteRole {
	scope: IRouteScope;
	permissions: IRoutePermission[];
}
