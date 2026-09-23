export type DemoRole = "employee" | "hr"

export const DEMO_EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_ID?.trim() || "E0001"

const HR_ONLY_ROUTES = new Set(["/hr-dashboard", "/import"])

export function isDemoRole(value: string | null): value is DemoRole {
  return value === "employee" || value === "hr"
}

export function canAccessDemoRoute(role: DemoRole, pathname: string): boolean {
  return role === "hr" || !HR_ONLY_ROUTES.has(pathname)
}

export function fallbackPathForDemoRole(role: DemoRole): "/hr-dashboard" | "/profile" {
  return role === "hr" ? "/hr-dashboard" : "/profile"
}
