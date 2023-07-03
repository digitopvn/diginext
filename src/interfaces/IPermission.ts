export const routeScopeList = ["all", "workspace", "team", "project", "app"] as const;
export type IRouteScope = typeof routeScopeList[number];

export const routePermissionList = ["full", "own", "public", "create", "read", "update", "delete"] as const;
export type IRoutePermission = typeof routePermissionList[number];
